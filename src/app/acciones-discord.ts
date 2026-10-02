"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirEspacio, sincronizarEspacio, sincronizarEspaciosDe } from "@/lib/discord-servidor";

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
  if (!user) return { ok: false, error: "Sin sesión." };
  try {
    const r = await abrirEspacio(salaId, user.id);
    if (r.ok) revalidatePath(`/salas/${salaId}`);
    return r;
  } catch (e) {
    reportar(e, "abrirEspacioDiscord");
    return { ok: false, error: "No se pudo crear el espacio en Discord. Probá de nuevo." };
  }
}

/** Desvincular el Discord propio: sale de todos los espacios privados. */
export async function desvincularDiscord(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await usuarioActual();
  if (!user) return { ok: false, error: "Sin sesión." };
  const { error } = await createAdminClient()
    .from("perfiles")
    .update({ discord_user_id: null, discord_usuario: null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "No se pudo desvincular." };
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
