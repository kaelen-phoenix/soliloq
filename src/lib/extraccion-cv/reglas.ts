/**
 * Reglas de extracción sobre el texto plano de un CV. Sin librerías: solo regex y
 * heurísticas. La calidad es limitada a propósito (ver issue #5) — el objetivo es ahorrar
 * tipeo, no completar el perfil solo. Nada de esto se guarda sin que la persona lo revise.
 *
 * NO se extrae la fecha de nacimiento (validación dura de ≥16 años; casi nunca está en un
 * CV). Los datos que el perfil no pide —teléfono, DNI, dirección exacta— se descartan
 * explícitamente antes de aplicar las reglas de campo.
 */

import { HABILIDADES, REDES } from "@/lib/constantes";
import { normalizarRed } from "@/lib/redes";

const RE_EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
// Teléfonos: secuencias de 7+ dígitos con separadores comunes, con o sin prefijo país.
const RE_TELEFONO = /(\+?\d[\d()\s.\-]{6,}\d)/g;
// DNI / documento argentino: 7-8 dígitos, a veces con puntos.
const RE_DNI = /\bdni[:\s]*[\d.]{7,10}\b/gi;
const RE_URL = /\bhttps?:\/\/[^\s)>\]]+/gi;
const RE_URL_SIN_ESQUEMA = /\b(?:www\.)?(?:instagram|tiktok|linkedin|vimeo|youtube|x|twitter)\.com\/[^\s)>\]]+/gi;

/**
 * Saca del texto lo que el perfil no debe guardar: emails, teléfonos, DNI. Se corre antes
 * de armar los bloques de experiencia para que un teléfono no termine colado ahí.
 */
export function descartarSensibles(texto: string): string {
  return texto
    .replace(RE_EMAIL, " ")
    .replace(RE_DNI, " ")
    .replace(RE_TELEFONO, (m) => (m.replace(/\D/g, "").length >= 7 ? " " : m));
}

const RE_NOMBRE_ETIQUETA = /(?:nombre|nombre y apellido)\s*[:\-]\s*(.+)/i;

/** Primeras líneas: una etiqueta "Nombre:" o, si no, la primera línea que parezca un nombre. */
export function extraerNombre(lineas: string[]): string | null {
  for (const l of lineas.slice(0, 12)) {
    const m = l.match(RE_NOMBRE_ETIQUETA);
    if (m) return limpiar(m[1]);
  }
  for (const l of lineas.slice(0, 6)) {
    const t = l.trim();
    // 2 a 4 palabras, todas empezando con mayúscula, sin dígitos ni símbolos raros.
    if (/^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ'’]+(?:\s+|$)){2,4}$/.test(t) && t.length <= 60) {
      return t;
    }
  }
  return null;
}

const ENCABEZADOS_EXPERIENCIA = [
  "experiencia",
  "trayectoria",
  "antecedentes",
  "formación",
  "formacion",
  "estudios",
  "capacitación",
  "capacitacion",
];
const ENCABEZADOS_CORTE = [
  "habilidades",
  "aptitudes",
  "skills",
  "idiomas",
  "contacto",
  "datos personales",
  "referencias",
  "redes",
];

/** El texto bajo un encabezado tipo "Experiencia", hasta el próximo encabezado o el final. */
export function extraerExperiencia(lineas: string[]): string | null {
  const idx = lineas.findIndex((l) =>
    ENCABEZADOS_EXPERIENCIA.some((e) => normalizar(l).startsWith(e))
  );
  if (idx === -1) return null;

  const bloque: string[] = [];
  for (const l of lineas.slice(idx + 1)) {
    if (ENCABEZADOS_CORTE.some((e) => normalizar(l).startsWith(e))) break;
    bloque.push(l);
  }
  const texto = limpiar(bloque.join("\n")).slice(0, 2000);
  return texto.length >= 10 ? texto : null;
}

/** Habilidades: cada entrada de la lista cerrada que aparezca mencionada en el texto. */
export function extraerHabilidades(texto: string): string[] {
  const plano = normalizar(texto);
  return HABILIDADES.filter((h) => {
    const clave = normalizar(h.split("/")[0]);
    return plano.includes(clave);
  });
}

/** URLs de redes conocidas, normalizadas a su forma canónica. */
export function extraerRedes(texto: string): Record<string, string> {
  const urls = [
    ...(texto.match(RE_URL) ?? []),
    ...(texto.match(RE_URL_SIN_ESQUEMA) ?? []).map((u) => `https://${u.replace(/^www\./, "")}`),
  ];
  const out: Record<string, string> = {};
  for (const url of urls) {
    let host: string;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    const red = REDES.find((r) => r.hosts.some((h) => h.replace(/^www\./, "") === host));
    if (!red || out[red.clave]) continue;
    const canonica = normalizarRed(red.clave, url);
    if (canonica) out[red.clave] = canonica;
  }
  return out;
}

const RE_UBICACION_ETIQUETA =
  /(?:ubicaci[oó]n|ciudad|localidad|residencia|domicilio)\s*[:\-]\s*(.+)/i;

/** Ubicación como texto libre — la persona la re-elige en el autocompletado (decisión de #5). */
export function extraerUbicacion(lineas: string[]): string | null {
  for (const l of lineas.slice(0, 20)) {
    const m = l.match(RE_UBICACION_ETIQUETA);
    if (m) {
      // Solo la localidad: cortar en la primera coma evita traer la dirección con altura.
      const v = limpiar(m[1]).split(/[,\n]/)[0].trim();
      if (v.length >= 2 && v.length <= 60 && !/\d{3,}/.test(v)) return v;
    }
  }
  return null;
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function limpiar(s: string): string {
  return s
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
