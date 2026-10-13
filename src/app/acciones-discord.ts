"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  abrirEspacioDe,
  borrarCanalesDe,
  canalesParaBorrarDe,
  desvincularDiscordDe,
  sincronizarIniciativaDe,
  sincronizarSalaDe,
  type Iniciativa,
  type PermisoBorrado,
  type Sesion,
} from "@/lib/discord-acciones";

export type { PermisoBorrado } from "@/lib/discord-acciones";

/**
 * Las acciones de Discord de la web. La lógica vive en `@/lib/discord-acciones`, que usa
 * también la app nativa (`/api/app/discord`); acá solo se resuelve la sesión de las cookies.
 */
async function sesion(): Promise<Sesion | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** «Abrir espacio en Discord» (#269): solo el dueño del Proyecto o Equipo. */
export async function abrirEspacioDiscord(
  salaId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const t = await getTranslations("chats.accionesDiscord");
  const s = await sesion();
  if (!s) return { ok: false, error: t("sinSesion") };
  const r = await abrirEspacioDe(s, salaId);
  if (!r.ok) return { ok: false, error: t(r.error) };
  revalidatePath(`/salas/${salaId}`);
  return r;
}

/** Desvincular el Discord propio: sale de todos los espacios privados. */
export async function desvincularDiscord(): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("chats.accionesDiscord");
  const s = await sesion();
  if (!s) return { ok: false, error: t("sinSesion") };
  const r = await desvincularDiscordDe(s);
  if (!r.ok) return { ok: false, error: t(r.error!) };
  revalidatePath("/perfil");
  return { ok: true };
}

/**
 * Pone al día el espacio de una sala (quién entra, quién sale, si la iniciativa se cerró).
 * Lo dispara la sala al abrirse; solo un integrante puede pedirlo.
 */
export async function sincronizarEspacioDeSala(salaId: string) {
  const s = await sesion();
  if (s) await sincronizarSalaDe(s, salaId);
}

/** Después de cerrar, reabrir o desactivar un Proyecto/Equipo (lo llama la pantalla del dueño). */
export async function sincronizarEspacioDeIniciativa(ids: Iniciativa) {
  const s = await sesion();
  if (s) await sincronizarIniciativaDe(s, ids);
}

/** Antes de borrar un Proyecto/Equipo: los ids de sus canales, firmados (`canalesParaBorrarDe`). */
export async function canalesParaBorrar(ids: Iniciativa): Promise<PermisoBorrado | null> {
  const s = await sesion();
  return s ? canalesParaBorrarDe(s, ids) : null;
}

/** Después de borrar la iniciativa: borra sus canales (ya sin sala), si el permiso es válido. */
export async function borrarCanalesDeIniciativa(permiso: PermisoBorrado | null) {
  const s = await sesion();
  if (s) await borrarCanalesDe(s, permiso);
}
