import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { GENEROS_BUSCABLES, HABILIDADES } from "@/lib/constantes";
import { revisarFidelidad } from "@/lib/fidelidad-ia";
import { consumirUsoIaClave, devolverUsoIa, enBloque, llamarModelo, objetoJson } from "@/lib/ia-servidor";
import {
  INSTRUCCIONES,
  INSTRUCCIONES_BUSQUEDA,
  INSTRUCCIONES_HABILIDADES,
  INSTRUCCIONES_SALUDO,
  MAX_ENTRADA,
  MAX_SALIDA,
  type TipoRedaccion,
} from "@/lib/ia-prompts";
import type { Database } from "@/lib/supabase/types";
import type { FiltrosBusqueda } from "@/lib/ia-tipos";

export type { FiltrosBusqueda } from "@/lib/ia-tipos";

/**
 * Las funciones de IA (#313–#322) con la sesión ya resuelta: las usan las server actions de la
 * web (`acciones-ia.ts`) y la app nativa (`/api/app/ia`). El error vuelve como clave de
 * `admin.ia` (con sus valores): cada una lo traduce en el idioma de quien lo ve.
 *
 * Cada uso pasa antes por el tope de `consumir_uso_ia()` (0100), y si falla o no se le da nada
 * a la persona, el uso no cuenta (#343).
 */
export type ErrorIa = { clave: string; valores?: Record<string, string | number> };
type Res<T> = ({ ok: true } & T) | { ok: false; error: ErrorIa };
const falla = (clave: string, valores?: ErrorIa["valores"]) => ({ ok: false as const, error: { clave, valores } });

type Cliente = SupabaseClient<Database>;

/** «✨ Mejorar redacción»: la propuesta solo se muestra si sale del texto de la persona (#317). */
export async function mejorarRedaccionDe(
  supabase: Cliente,
  texto: string,
  tipo: TipoRedaccion = "experiencia",
): Promise<Res<{ texto: string }>> {
  const entrada = texto.trim();
  if (!Object.hasOwn(INSTRUCCIONES, tipo)) return falla("noSePuedeMejorar");
  if (entrada.length < 15) return falla("masTexto");
  if (entrada.length > MAX_ENTRADA) return falla("muyLargoMaximo", { max: MAX_ENTRADA });

  const uso = await consumirUsoIaClave(supabase);
  if (uso.error !== undefined) return falla(uso.error);
  try {
    const salida = (await llamarModelo({ sistema: INSTRUCCIONES[tipo], usuario: enBloque("texto", entrada) })).slice(
      0,
      MAX_SALIDA,
    );
    const veredicto = revisarFidelidad(entrada, salida);
    if (!veredicto.ok) {
      await devolverUsoIa(uso.usoId).catch(() => {});
      return falla(veredicto.motivo === "sin_datos" ? `sinDatos.${tipo}` : "noSinCambiar");
    }
    return { ok: true, texto: salida };
  } catch (e) {
    await devolverUsoIa(uso.usoId).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "mejorar redacción", tipo } });
    return falla("mejorarFallo");
  }
}

/** «Sugerir habilidades» (#320): solo devuelve valores de `HABILIDADES`. */
export async function sugerirHabilidadesDe(supabase: Cliente, texto: string): Promise<Res<{ habilidades: string[] }>> {
  const entrada = texto.trim();
  if (entrada.length < 15) return falla("primeroExperiencia");
  if (entrada.length > MAX_ENTRADA) return falla("muyLargo");

  const uso = await consumirUsoIaClave(supabase);
  if (uso.error !== undefined) return falla(uso.error);
  try {
    const crudo = await llamarModelo({
      sistema: INSTRUCCIONES_HABILIDADES,
      usuario: enBloque("texto", entrada),
      maxTokens: 200,
      json: true,
    });
    const json = objetoJson(crudo);
    if (!json) throw new Error("sugerir habilidades: la respuesta no es un objeto JSON");
    const crudas = json.habilidades;
    // Sin la lista no es «no hay habilidades»: es una respuesta que no sirve.
    if (!Array.isArray(crudas)) throw new Error("sugerir habilidades: falta la lista");
    const lista: unknown[] = crudas;
    return { ok: true, habilidades: HABILIDADES.filter((h) => lista.includes(h)) };
  } catch (e) {
    await devolverUsoIa(uso.usoId).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "sugerir habilidades" } });
    return falla("sugerirFallo");
  }
}

/** «Buscar escribiendo» (#321): lo escrito → filtros, validados contra las listas cerradas. */
export async function interpretarBusquedaDe(
  supabase: Cliente,
  consulta: string,
): Promise<Res<{ filtros: FiltrosBusqueda }>> {
  const entrada = consulta.trim();
  if (entrada.length < 3) return falla("escribiQueBuscas");
  if (entrada.length > 300) return falla("masCorto", { max: 300 });

  const uso = await consumirUsoIaClave(supabase);
  if (uso.error !== undefined) return falla(uso.error);
  try {
    const crudo = await llamarModelo({
      sistema: INSTRUCCIONES_BUSQUEDA,
      usuario: enBloque("busqueda", entrada),
      maxTokens: 200,
      json: true,
    });
    const json = objetoJson(crudo);
    // Mal formada no es «sin filtros»: es una falla (#343), y el uso se devuelve en el catch.
    if (!json) throw new Error("interpretar búsqueda: la respuesta no es un objeto JSON");
    const j = json as Record<string, any>;
    const edad = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 16 && v <= 100 ? v : undefined);
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
    await devolverUsoIa(uso.usoId).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "interpretar búsqueda" } });
    return falla("interpretarFallo");
  }
}

/**
 * «✨ Escribir un saludo» en el chat de un Proyecto o Equipo propio (#322): un primer mensaje con
 * el título, la descripción y quiénes se sumaron (y su rol). Va al campo de texto; no se manda solo.
 */
export async function borradorSaludoDe(supabase: Cliente, user: User, salaId: string): Promise<Res<{ texto: string }>> {
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
  if (!sala || (obra?.creador_id ?? equipo?.creador_id) !== user.id) return falla("soloQuienArmo");

  const { data: integrantes } = await supabase
    .from("sala_integrantes")
    .select("perfil_id")
    .eq("sala_id", salaId)
    .neq("perfil_id", user.id);
  const ids = (integrantes ?? []).map((i) => i.perfil_id);
  if (ids.length === 0) return falla("nadieSeSumo");
  const { data: talentos } = await supabase.from("perfiles_talento").select("id, nombre").in("id", ids);

  // El rol de cada uno, si es un Proyecto (un Equipo no tiene roles).
  const rolPorTalento = new Map<string, string>();
  if (sala.obra_id) {
    const { data: cobertura } = await supabase.rpc("cobertura_iniciativa", { p_obra_id: sala.obra_id, p_equipo_id: null });
    for (const c of cobertura ?? []) if (c.talento_id && c.rol_nombre) rolPorTalento.set(c.talento_id, c.rol_nombre);
  }

  const personas = (talentos ?? [])
    // Nombres y roles los escribe cada persona: van como datos JSON, no como texto suelto.
    .map((t) => JSON.stringify({ nombre: t.nombre, rol: rolPorTalento.get(t.id) ?? null }))
    .join("\n");
  const descripcion = obra?.sinopsis ?? equipo?.descripcion;
  const datos = [
    `${obra ? "Proyecto" : "Equipo"}: ${obra?.titulo ?? equipo?.titulo}`,
    descripcion ? `Descripción: ${descripcion.slice(0, 1000)}` : "",
    `Se suman:\n${personas}`,
  ]
    .filter(Boolean)
    .join("\n");

  const uso = await consumirUsoIaClave(supabase);
  if (uso.error !== undefined) return falla(uso.error);
  try {
    const salida = await llamarModelo({ sistema: INSTRUCCIONES_SALUDO, usuario: enBloque("datos", datos), maxTokens: 400 });
    return { ok: true, texto: salida.slice(0, 600) };
  } catch (e) {
    await devolverUsoIa(uso.usoId).catch(() => {});
    Sentry.captureException(e, { extra: { accion: "borrador saludo" } });
    return falla("saludoFallo");
  }
}
