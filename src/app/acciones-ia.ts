"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revisarFidelidad } from "@/lib/fidelidad-ia";
import { consumirUsoIa, devolverUsoIa, enBloque, llamarModelo, objetoJson } from "@/lib/ia-servidor";
import { GENEROS_BUSCABLES, HABILIDADES } from "@/lib/constantes";
import {
  ERROR_SIN_DATOS,
  INSTRUCCIONES,
  INSTRUCCIONES_BUSQUEDA,
  INSTRUCCIONES_HABILIDADES,
  INSTRUCCIONES_SALUDO,
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
  if (!Object.hasOwn(INSTRUCCIONES, tipo)) return { ok: false, error: "No se puede mejorar este texto." };
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
      // La persona no recibe nada: el uso no cuenta (#343).
      await devolverUsoIa(supabase).catch(() => {});
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
    // #343: si falló, el uso no cuenta.
    await devolverUsoIa(supabase).catch(() => {});
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
    const crudas = objetoJson(crudo).habilidades;
    const lista: unknown[] = Array.isArray(crudas) ? crudas : [];
    const validas = HABILIDADES.filter((h) => lista.includes(h));
    return { ok: true, habilidades: validas };
  } catch (e) {
    // #343: si falló, el uso no cuenta.
    await devolverUsoIa(supabase).catch(() => {});
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
    const j = objetoJson(crudo) as Record<string, any>;
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
    // #343: si falló, el uso no cuenta.
    await devolverUsoIa(supabase).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "interpretar búsqueda" } });
    return { ok: false, error: "No pudimos interpretarlo ahora. Usá los filtros de abajo." };
  }
}

/**
 * «✨ Escribir un saludo» en el chat de un Proyecto o Equipo propio (#322): arma un primer
 * mensaje de bienvenida con el título, la descripción y quiénes se sumaron (y su rol). Va al
 * campo de texto para editarlo; no se manda solo.
 */
export async function borradorSaludo(salaId: string): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: sala } = await supabase
    .from("salas")
    .select("obra_id, equipo_id, obras(titulo, sinopsis, creador_id), equipos(titulo, descripcion, creador_id)")
    .eq("id", salaId)
    .maybeSingle();
  const obra = (Array.isArray(sala?.obras) ? sala?.obras[0] : sala?.obras) as
    | { titulo: string; sinopsis: string | null; creador_id: string }
    | null
    | undefined;
  const equipo = (Array.isArray(sala?.equipos) ? sala?.equipos[0] : sala?.equipos) as
    | { titulo: string; descripcion: string | null; creador_id: string }
    | null
    | undefined;
  if (!sala || (obra?.creador_id ?? equipo?.creador_id) !== user.id) {
    return { ok: false, error: "Solo quien armó el proyecto puede usar esto." };
  }

  const { data: integrantes } = await supabase
    .from("sala_integrantes")
    .select("perfil_id")
    .eq("sala_id", salaId)
    .neq("perfil_id", user.id);
  const ids = (integrantes ?? []).map((i) => i.perfil_id);
  if (ids.length === 0) return { ok: false, error: "Todavía no se sumó nadie al chat." };
  const { data: talentos } = await supabase.from("perfiles_talento").select("id, nombre").in("id", ids);

  // El rol de cada uno, si es un Proyecto (un Equipo no tiene roles).
  const rolPorTalento = new Map<string, string>();
  if (sala.obra_id) {
    const { data: cobertura } = await supabase.rpc("cobertura_iniciativa", {
      p_obra_id: sala.obra_id,
      p_equipo_id: null,
    });
    for (const c of cobertura ?? []) if (c.talento_id && c.rol_nombre) rolPorTalento.set(c.talento_id, c.rol_nombre);
  }

  const personas = (talentos ?? [])
    // Nombres y roles los escribe cada persona: van como datos JSON, no como texto suelto.
    .map((t) => JSON.stringify({ nombre: t.nombre, rol: rolPorTalento.get(t.id) ?? null }))
    .join("\n");
  const datos = [
    `${obra ? "Proyecto" : "Equipo"}: ${obra?.titulo ?? equipo?.titulo}`,
    (obra?.sinopsis ?? equipo?.descripcion) ? `Descripción: ${(obra?.sinopsis ?? equipo?.descripcion)!.slice(0, 1000)}` : "",
    `Se suman:\n${personas}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tope = await consumirUsoIa(supabase);
  if (tope) return { ok: false, error: tope };
  try {
    const salida = await llamarModelo({ sistema: INSTRUCCIONES_SALUDO, usuario: enBloque("datos", datos), maxTokens: 400 });
    return { ok: true, texto: salida.slice(0, 600) };
  } catch (e) {
    // #343: si falló, el uso no cuenta.
    await devolverUsoIa(supabase).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "borrador saludo" } });
    return { ok: false, error: "No pudimos escribirlo ahora. Probá de nuevo en un rato." };
  }
}
