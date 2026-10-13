import * as Sentry from "@sentry/nextjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  abrirEspacio,
  borrarCanalesHuerfanos,
  canalesDeIniciativa,
  sincronizarEspacio,
  sincronizarEspaciosDe,
  sincronizarEspaciosDeIniciativa,
} from "@/lib/discord-servidor";

/**
 * Las acciones de Discord (#269) con la sesión ya resuelta: las usan las server actions de la
 * web (`acciones-discord.ts`, con la sesión de las cookies) y el endpoint de la app nativa
 * (`/api/app/discord`, con la sesión del Bearer). Los errores de Discord se reportan y no
 * frenan nada de la app.
 */
export type Sesion = { supabase: SupabaseClient<Database>; user: User };
export type Iniciativa = { obraId?: string; equipoId?: string };

export function reportarDiscord(e: unknown, accion: string) {
  Sentry.captureException(e, { tags: { origen: "discord" }, extra: { accion } });
}

/** «Abrir espacio en Discord»: solo el dueño del Proyecto o Equipo. `error` es la clave del texto. */
export async function abrirEspacioDe(
  { user }: Sesion,
  salaId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const r = await abrirEspacio(salaId, user.id);
    return r.ok ? r : { ok: false, error: `espacio.${r.error}` };
  } catch (e) {
    reportarDiscord(e, "abrirEspacioDiscord");
    return { ok: false, error: "errorCrear" };
  }
}

/** Desvincular el Discord propio: sale de todos los espacios privados. */
export async function desvincularDiscordDe({ user }: Sesion): Promise<{ ok: boolean; error?: string }> {
  const { error } = await createAdminClient()
    .from("perfiles")
    .update({ discord_user_id: null, discord_usuario: null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "errorDesvincular" };
  try {
    // Ya sin su cuenta en la base, la sincronización le saca el acceso a cada canal.
    await sincronizarEspaciosDe(user.id);
  } catch (e) {
    reportarDiscord(e, "desvincularDiscord");
  }
  return { ok: true };
}

/** Todos los espacios de las salas propias (después de aceptar una convocatoria o dar de baja). */
export async function sincronizarMisEspacios({ user }: Sesion) {
  try {
    await sincronizarEspaciosDe(user.id);
  } catch (e) {
    reportarDiscord(e, "sincronizarEspaciosDe");
  }
}

/** El espacio de una sala: solo un integrante puede pedirlo (RLS: solo un integrante la ve). */
export async function sincronizarSalaDe({ supabase }: Sesion, salaId: string) {
  const { data: sala } = await supabase.from("salas").select("id").eq("id", salaId).maybeSingle();
  if (!sala) return;
  try {
    await sincronizarEspacio(salaId);
  } catch (e) {
    reportarDiscord(e, "sincronizarEspacioDeSala");
  }
}

/** ¿La iniciativa es de quien llama? */
async function esDueno({ supabase, user }: Sesion, ids: Iniciativa) {
  if (ids.obraId) {
    const { data } = await supabase.from("obras").select("creador_id").eq("id", ids.obraId).maybeSingle();
    return data?.creador_id === user.id;
  }
  if (ids.equipoId) {
    const { data } = await supabase.from("equipos").select("creador_id").eq("id", ids.equipoId).maybeSingle();
    return data?.creador_id === user.id;
  }
  return false;
}

/** Después de cerrar, reabrir o desactivar un Proyecto/Equipo (lo pide la pantalla del dueño). */
export async function sincronizarIniciativaDe(sesion: Sesion, ids: Iniciativa) {
  if (!(await esDueno(sesion, ids))) return;
  try {
    await sincronizarEspaciosDeIniciativa(ids);
  } catch (e) {
    reportarDiscord(e, "sincronizarEspacioDeIniciativa");
  }
}

/**
 * La lista de canales a borrar viaja por el cliente entre los dos pasos del borrado, así que va
 * firmada por el servidor: solo vale para quien la pidió (y verificó ser el dueño), sin cambios
 * y por 10 minutos. Si no, cualquiera podría mandar ids de otros canales.
 */
function firmar(datos: string) {
  return createHmac("sha256", process.env.DISCORD_BOT_TOKEN ?? "").update(datos).digest("base64url");
}

export type PermisoBorrado = { canales: string[]; usuario: string; vence: number; firma: string };

/**
 * Antes de borrar un Proyecto/Equipo: los ids de sus canales, firmados, para borrarlos después.
 * Se borran recién cuando se confirmó el borrado de la iniciativa: si el borrado de la fila
 * falla, la iniciativa conserva su espacio.
 */
export async function canalesParaBorrarDe(sesion: Sesion, ids: Iniciativa): Promise<PermisoBorrado | null> {
  if (!(await esDueno(sesion, ids))) return null;
  try {
    const canales = await canalesDeIniciativa(ids);
    if (canales.length === 0) return null;
    const vence = Date.now() + 10 * 60_000;
    const usuario = sesion.user.id;
    return { canales, usuario, vence, firma: firmar(`${usuario}|${vence}|${canales.join(",")}`) };
  } catch (e) {
    reportarDiscord(e, "canalesParaBorrar");
    return null;
  }
}

/** Después de borrar la iniciativa: borra sus canales (ya sin sala), si el permiso es válido. */
export async function borrarCanalesDe({ user }: Sesion, permiso: PermisoBorrado | null) {
  if (!permiso || permiso.usuario !== user.id || permiso.vence < Date.now()) return;
  if (!Array.isArray(permiso.canales) || typeof permiso.firma !== "string") return;
  const esperada = Buffer.from(firmar(`${permiso.usuario}|${permiso.vence}|${permiso.canales.join(",")}`));
  const recibida = Buffer.from(permiso.firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return;
  try {
    await borrarCanalesHuerfanos(permiso.canales);
  } catch (e) {
    reportarDiscord(e, "borrarCanalesDeIniciativa");
  }
}
