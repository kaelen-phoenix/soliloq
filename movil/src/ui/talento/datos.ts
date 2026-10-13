import {
  errorConocidoConvocar,
  errorConocidoDescartar,
  errorConocidoDesvincularSala,
  errorConocidoRetirarme,
  type ErrorMatches,
  type IniciativaBuscada,
} from "@/lib/matches";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";

/**
 * Lo que en la web hacen `iniciativa-servidor.ts` y las server actions de `/matches` (#393):
 * acá corre en el teléfono contra la misma base, con los mismos permisos (RLS). Los errores
 * vuelven como clave de `proyectos.matches.errores` (o `chats.acciones` al salir de un chat).
 */
export type Resultado = { ok: true } | { ok: false; error: string };

/** Path de Storage → URL pública (todas las fotos viven en `fotos-perfil`). */
export const urlFoto = (path: string | null | undefined) =>
  path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;

/**
 * La iniciativa que el Creador está llevando adelante ahora (#105/#107): el Equipo activo más
 * reciente o, si no, su Proyecto más reciente sin cerrar.
 */
export async function iniciativaActiva(creadorId: string): Promise<IniciativaBuscada | null> {
  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, titulo")
    .eq("creador_id", creadorId)
    .eq("activo", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (equipo) return { tipo: "equipo", id: equipo.id, titulo: equipo.titulo };
  const { data: obra } = await supabase
    .from("obras")
    .select("id, titulo")
    .eq("creador_id", creadorId)
    .neq("estado", "cerrada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return obra ? { tipo: "obra", id: obra.id, titulo: obra.titulo } : null;
}

/**
 * Para qué se busca talento (#294): la iniciativa pedida si es de quien busca y sigue abierta;
 * si no se pidió ninguna, la activa.
 */
export async function iniciativaParaBuscar(
  creadorId: string,
  pedida: { obra?: string | null; equipo?: string | null },
): Promise<IniciativaBuscada | null> {
  if (pedida.equipo) {
    const { data } = await supabase
      .from("equipos")
      .select("id, titulo")
      .eq("id", pedida.equipo)
      .eq("creador_id", creadorId)
      .eq("activo", true)
      .maybeSingle();
    return data ? { tipo: "equipo", id: data.id, titulo: data.titulo } : null;
  }
  if (pedida.obra) {
    const { data } = await supabase
      .from("obras")
      .select("id, titulo")
      .eq("id", pedida.obra)
      .eq("creador_id", creadorId)
      .neq("estado", "cerrada")
      .maybeSingle();
    return data ? { tipo: "obra", id: data.id, titulo: data.titulo } : null;
  }
  return iniciativaActiva(creadorId);
}

/** La primera foto del Proyecto o Equipo, para la placa «Hay interés». */
export async function fotoDeIniciativa(i: IniciativaBuscada): Promise<string | null> {
  const { data } =
    i.tipo === "obra"
      ? await supabase.from("fotos_obra").select("storage_path").eq("obra_id", i.id).order("orden").limit(1).maybeSingle()
      : await supabase.from("fotos_equipo").select("storage_path").eq("equipo_id", i.id).order("orden").limit(1).maybeSingle();
  return urlFoto(data?.storage_path);
}

const error = (clave: ErrorMatches | string): Resultado => ({ ok: false, error: clave });

export async function marcarMatchMostrado(matchId: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("marcar_match_mostrado", { p_match_id: matchId });
  return e ? error("cerrarAviso") : { ok: true };
}

/** Convocar (definitivo) a alguien: recién acá se le avisa (#143). `rolId` en un Proyecto (#152). */
export async function convocarMatch(matchId: string, rolId?: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("convocar", { p_match_id: matchId, p_rol_id: rolId ?? null });
  return e ? error(errorConocidoConvocar(e.message) ?? "convocar") : { ok: true };
}

export async function descartarConvocado(matchId: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("descartar_convocado", { p_match_id: matchId });
  return e ? error(errorConocidoDescartar(e.message) ?? "descartar") : { ok: true };
}

/** Dar de baja a un convocado que ya aceptó: libera el lugar (#107) y sale de Discord (#269). */
export async function darDeBajaConvocado(convocatoriaId: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("dar_de_baja_convocado", { p_convocatoria_id: convocatoriaId });
  if (e) return error("darDeBaja");
  llamarApi("discord", { accion: "mis-espacios" });
  return { ok: true };
}

/** «Me interesa» (o no) en un talento, hacia el Proyecto o Equipo para el que se busca (#294). */
export async function marcarInteresEnTalento(
  talentoId: string,
  interesa: boolean,
  iniciativa: IniciativaBuscada,
): Promise<Resultado> {
  const { error: e } = await supabase.rpc("marcar_interes", {
    p_a_perfil: talentoId,
    p_obra_id: iniciativa.tipo === "obra" ? iniciativa.id : null,
    p_equipo_id: iniciativa.tipo === "equipo" ? iniciativa.id : null,
    p_interesa: interesa,
  });
  return e ? error("aplicar") : { ok: true };
}

/** El Talento se baja de un match o de una convocatoria sin responder (#298). */
export async function retirarmeDeMatch(matchId: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("retirarme_de_match", { p_match_id: matchId });
  return e ? error(errorConocidoRetirarme(e.message) ?? "aplicar") : { ok: true };
}

/** Salir de un chat (la clave del error es de `chats.acciones`). Sale también de Discord. */
export async function desvincularmeDeSala(salaId: string): Promise<Resultado> {
  const { error: e } = await supabase.rpc("desvincularme_de_sala", { p_sala_id: salaId });
  if (e) return error(errorConocidoDesvincularSala(e.message) ?? "errorGenerico");
  llamarApi("discord", { accion: "sala", salaId });
  return { ok: true };
}
