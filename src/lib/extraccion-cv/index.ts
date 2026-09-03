/**
 * Extracción de datos de un CV (PDF o DOCX) para precargar el alta de Talento (issue #5).
 * Corre en el server, en memoria: el archivo llega como Buffer y se descarta al responder.
 * Sin OCR de imágenes en v1 (es el camino más flojo; ver el change de OpenSpec).
 *
 * Nada de lo que devuelve se guarda: alimenta el formulario, que la persona revisa y
 * confirma. Si algo falla, devuelve `{ ok: false }` y el flujo cae al formulario vacío.
 */

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import {
  descartarSensibles,
  extraerExperiencia,
  extraerHabilidades,
  extraerNombre,
  extraerRedes,
  extraerUbicacion,
} from "./reglas";

export const MIME_PDF = "application/pdf";
export const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MIMES_ACEPTADOS = [MIME_PDF, MIME_DOCX];

export const MAX_BYTES_DOC = 8 * 1024 * 1024;
export const MAX_PAGINAS_PDF = 15;

/** Los campos que las reglas pueden precargar. Nunca `fecha_nacimiento`. */
export interface CamposCV {
  nombre?: string;
  ubicacion_texto?: string;
  experiencia?: string;
  habilidades?: string[];
  redes?: Record<string, string>;
}

export interface ResultadoExtraccion {
  ok: boolean;
  campos: CamposCV;
  /** Qué campos salieron del archivo, para marcarlos en el formulario. */
  marcados: string[];
}

const VACIO: ResultadoExtraccion = { ok: false, campos: {}, marcados: [] };

async function pdfATexto(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const info = await parser.getInfo().catch(() => null);
    if (info && typeof info.total === "number" && info.total > MAX_PAGINAS_PDF) {
      return null;
    }
    const res = await parser.getText();
    return res.text ?? null;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function docxATexto(buffer: Buffer): Promise<string | null> {
  const res = await mammoth.extractRawText({ buffer });
  return res.value || null;
}

export async function extraerDeCV(
  buffer: Buffer,
  mime: string
): Promise<ResultadoExtraccion> {
  let textoCrudo: string | null = null;
  try {
    if (mime === MIME_PDF) textoCrudo = await pdfATexto(buffer);
    else if (mime === MIME_DOCX) textoCrudo = await docxATexto(buffer);
  } catch {
    return VACIO;
  }

  if (!textoCrudo || textoCrudo.trim().length < 20) return VACIO;

  const texto = descartarSensibles(textoCrudo);
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const campos: CamposCV = {};
  const marcados: string[] = [];
  const poner = <K extends keyof CamposCV>(k: K, v: CamposCV[K] | null | undefined) => {
    if (v == null || (Array.isArray(v) && v.length === 0) || v === "") return;
    campos[k] = v;
    marcados.push(k === "ubicacion_texto" ? "ubicacion" : k);
  };

  poner("nombre", extraerNombre(lineas));
  poner("ubicacion_texto", extraerUbicacion(lineas));
  poner("experiencia", extraerExperiencia(lineas));
  poner("habilidades", extraerHabilidades(texto));
  poner("redes", Object.keys(extraerRedes(texto)).length ? extraerRedes(texto) : null);

  return { ok: marcados.length > 0, campos, marcados };
}
