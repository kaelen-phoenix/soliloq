"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revisarFidelidad } from "@/lib/fidelidad-ia";
import { consumirUsoIa, enBloque, llamarModelo } from "@/lib/ia-servidor";
import { GENEROS_BUSCABLES, HABILIDADES } from "@/lib/constantes";
import {
  ERROR_SIN_DATOS,
  INSTRUCCIONES,
  INSTRUCCIONES_BUSQUEDA,
  INSTRUCCIONES_HABILIDADES,
  MAX_ENTRADA,
  MAX_SALIDA,
  type TipoRedaccion,
} from "@/lib/ia-prompts";

type Resultado = { ok: true; texto: string } | { ok: false; error: string };

/**
 * «✨ Mejorar redacción» (#313, #319): la Experiencia del perfil, la sinopsis del Proyecto, la
 * descripción del Equipo y la de cada rol. Cada uso pasa antes por el tope de
 * `consumir_uso_ia()` (0100), y la propuesta solo se muestra si sale del texto de la persona
 * (#317). La persona la ve y elige si la usa.
 */
export async function mejorarRedaccion(texto: string, tipo: TipoRedaccion = "experiencia"): Promise<Resultado> {
  const entrada = texto.trim();
  if (!(tipo in INSTRUCCIONES)) return { ok: false, error: "No se puede mejorar este texto." };
  if (entrada.length < 15) return { ok: false, error: "Escribí o pegá un poco más de texto primero." };
  if (entrada.length > MAX_ENTRADA) {
    return { ok: false, error: `El texto es muy largo (máximo ${MAX_ENTRADA} caracteres).` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const tope = await consumirUsoIa(supabase);
  if (tope) return { ok: false, error: tope };

  try {
    const salida = (
      await llamarModelo({ sistema: INSTRUCCIONES[tipo], usuario: enBloque("texto", entrada) })
    ).slice(0, MAX_SALIDA);
    const veredicto = revisarFidelidad(entrada, salida);
    if (!veredicto.ok) {
      return {
        ok: false,
        error:
          veredicto.motivo === "sin_datos"
            ? ERROR_SIN_DATOS[tipo]
            : "No pudimos mejorarlo sin cambiarle el contenido. Probá con un texto más completo.",
      };
    }
    return { ok: true, texto: salida };
  } catch (e) {
    Sentry.captureException(e, { extra: { accion: "mejorar redacción", tipo } });
    return { ok: false, error: "No pudimos mejorarlo ahora. Probá de nuevo en un rato." };
  }
}

/**
 * «Sugerir habilidades» (#320): lee la Experiencia y propone cuáles de las habilidades de la
 * lista aparecen ahí. Solo devuelve valores de `HABILIDADES`; la persona las marca o no.
 */
export async function sugerirHabilidades(
  texto: string,
): Promise<{ ok: true; habilidades: string[] } | { ok: false; error: string }> {
  const entrada = texto.trim();
  if (entrada.length < 15) return { ok: false, error: "Primero escribí tu experiencia." };
  if (entrada.length > MAX_ENTRADA) return { ok: false, error: "El texto es muy largo." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const tope = await consumirUsoIa(supabase);
  if (tope) return { ok: false, error: tope };

  try {
    const crudo = await llamarModelo({ sistema: INSTRUCCIONES_HABILIDADES, usuario: enBloque("texto", entrada), maxTokens: 200, json: true });
    const lista = (JSON.parse(crudo)?.habilidades ?? []) as unknown[];
    const validas = HABILIDADES.filter((h) => lista.includes(h));
    return { ok: true, habilidades: validas };
  } catch (e) {
    Sentry.captureException(e, { extra: { accion: "sugerir habilidades" } });
    return { ok: false, error: "No pudimos sugerirlas ahora. Probá de nuevo en un rato." };
  }
}

export interface FiltrosBusqueda {
  edadMin?: number;
  edadMax?: number;
  generos?: string[];
  habilidades?: string[];
  zona?: string;
  texto?: string;
}

/**
 * «Buscar escribiendo» (#321): convierte lo que alguien escribió («actriz de 30 a 40 que cante,
 * cerca de Palermo») en los filtros del buscador. Todo se valida contra las listas cerradas;
 * la persona ve los filtros aplicados y los corrige.
 */
export async function interpretarBusqueda(
  consulta: string,
): Promise<{ ok: true; filtros: FiltrosBusqueda } | { ok: false; error: string }> {
  const entrada = consulta.trim();
  if (entrada.length < 3) return { ok: false, error: "Escribí qué estás buscando." };
  if (entrada.length > 300) return { ok: false, error: "Escribilo más corto (hasta 300 caracteres)." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const tope = await consumirUsoIa(supabase);
  if (tope) return { ok: false, error: tope };

  try {
    const crudo = await llamarModelo({
      sistema: INSTRUCCIONES_BUSQUEDA,
      usuario: enBloque("busqueda", entrada),
      maxTokens: 200,
      json: true,
    });
    const j = JSON.parse(crudo) ?? {};
    const edad = (v: unknown) =>
      typeof v === "number" && Number.isInteger(v) && v >= 16 && v <= 100 ? v : undefined;
    const generosValidos = GENEROS_BUSCABLES.map((g) => g.valor as string);
    const filtros: FiltrosBusqueda = {
      edadMin: edad(j.edadMin),
      edadMax: edad(j.edadMax),
      generos: Array.isArray(j.generos) ? j.generos.filter((g: unknown) => generosValidos.includes(g as string)) : [],
      habilidades: Array.isArray(j.habilidades) ? HABILIDADES.filter((h) => j.habilidades.includes(h)) : [],
      zona: typeof j.zona === "string" && j.zona.trim() ? j.zona.trim().slice(0, 80) : undefined,
      texto: typeof j.texto === "string" && j.texto.trim() ? j.texto.trim().slice(0, 40) : undefined,
    };
    if (filtros.edadMin && filtros.edadMax && filtros.edadMin > filtros.edadMax) {
      [filtros.edadMin, filtros.edadMax] = [filtros.edadMax, filtros.edadMin];
    }
    return { ok: true, filtros };
  } catch (e) {
    Sentry.captureException(e, { extra: { accion: "interpretar búsqueda" } });
    return { ok: false, error: "No pudimos interpretarlo ahora. Usá los filtros de abajo." };
  }
}
