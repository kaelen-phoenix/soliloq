"use server";

import * as Sentry from "@sentry/nextjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  abrirEspacio,
  borrarCanalesHuerfanos,
  canalesDeIniciativa,
  sincronizarEspacio,
  sincronizarEspaciosDe,
  sincronizarEspaciosDeIniciativa,
} from "@/lib/discord-servidor";

/** Errores de Discord: se reportan y no frenan nada de la app. */
function reportar(e: unknown, accion: string) {
  Sentry.captureException(e, { tags: { origen: "discord" }, extra: { accion } });
}

async function usuarioActual() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** «Abrir espacio en Discord» (#269): solo el dueño del Proyecto o Equipo. */
export async function abrirEspacioDiscord(
  salaId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { user } = await usuarioActual();
  const t = await getTranslations("chats.accionesDiscord");
  if (!user) return { ok: false, error: t("sinSesion") };
  try {
    const r = await abrirEspacio(salaId, user.id);
    if (r.ok) revalidatePath(`/salas/${salaId}`);
    return r;
  } catch (e) {
    reportar(e, "abrirEspacioDiscord");
    return { ok: false, error: t("errorCrear") };
  }
}

/** Desvincular el Discord propio: sale de todos los espacios privados. */
export async function desvincularDiscord(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await usuarioActual();
  const t = await getTranslations("chats.accionesDiscord");
  if (!user) return { ok: false, error: t("sinSesion") };
  const { error } = await createAdminClient()
    .from("perfiles")
    .update({ discord_user_id: null, discord_usuario: null })
    .eq("id", user.id);
  if (error) return { ok: false, error: t("errorDesvincular") };
  try {
    // Ya sin su cuenta en la base, la sincronización le saca el acceso a cada canal.
    await sincronizarEspaciosDe(user.id);
  } catch (e) {
    reportar(e, "desvincularDiscord");
  }
  revalidatePath("/perfil");
  return { ok: true };
}

/**
 * Pone al día el espacio de una sala (quién entra, quién sale, si la iniciativa se cerró).
 * Lo dispara la sala al abrirse; solo un integrante puede pedirlo.
 */
export async function sincronizarEspacioDeSala(salaId: string) {
  const { supabase, user } = await usuarioActual();
  if (!user) return;
  // RLS: solo un integrante ve la sala.
  const { data: sala } = await supabase.from("salas").select("id").eq("id", salaId).maybeSingle();
  if (!sala) return;
  try {
    await sincronizarEspacio(salaId);
  } catch (e) {
    reportar(e, "sincronizarEspacioDeSala");
  }
}

type Iniciativa = { obraId?: string; equipoId?: string };

/** ¿La iniciativa es de quien llama? */
async function esDueno(ids: Iniciativa) {
  const { supabase, user } = await usuarioActual();
  if (!user) return false;
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

/** Después de cerrar, reabrir o desactivar un Proyecto/Equipo (lo llama la pantalla del dueño). */
export async function sincronizarEspacioDeIniciativa(ids: Iniciativa) {
  if (!(await esDueno(ids))) return;
  try {
    await sincronizarEspaciosDeIniciativa(ids);
  } catch (e) {
    reportar(e, "sincronizarEspacioDeIniciativa");
  }
}

/**
 * La lista de canales a borrar viaja por el navegador entre los dos pasos del borrado, así que
 * va firmada por el servidor: solo vale para quien la pidió (y verificó ser el dueño), sin
 * cambios y por 10 minutos. Si no, cualquiera podría mandar ids de otros canales.
 */
function firmar(datos: string) {
  return createHmac("sha256", process.env.DISCORD_BOT_TOKEN ?? "").update(datos).digest("base64url");
}

export type PermisoBorrado = { canales: string[]; usuario: string; vence: number; firma: string };

/**
 * Antes de borrar un Proyecto/Equipo: los ids de sus canales, firmados, para borrarlos
 * después. Se borran recién cuando se confirmó el borrado de la iniciativa
 * (`borrarCanalesDeIniciativa`): si el borrado de la fila falla, la iniciativa conserva su
 * espacio.
 */
export async function canalesParaBorrar(ids: Iniciativa): Promise<PermisoBorrado | null> {
  const { user } = await usuarioActual();
  if (!user || !(await esDueno(ids))) return null;
  try {
    const canales = await canalesDeIniciativa(ids);
    if (canales.length === 0) return null;
    const vence = Date.now() + 10 * 60_000;
    return { canales, usuario: user.id, vence, firma: firmar(`${user.id}|${vence}|${canales.join(",")}`) };
  } catch (e) {
    reportar(e, "canalesParaBorrar");
    return null;
  }
}

/** Después de borrar la iniciativa: borra sus canales (ya sin sala), si el permiso es válido. */
export async function borrarCanalesDeIniciativa(permiso: PermisoBorrado | null) {
  const { user } = await usuarioActual();
  if (!user || !permiso || permiso.usuario !== user.id || permiso.vence < Date.now()) return;
  const esperada = Buffer.from(firmar(`${permiso.usuario}|${permiso.vence}|${permiso.canales.join(",")}`));
  const recibida = Buffer.from(permiso.firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return;
  try {
    await borrarCanalesHuerfanos(permiso.canales);
  } catch (e) {
    reportar(e, "borrarCanalesDeIniciativa");
  }
}
