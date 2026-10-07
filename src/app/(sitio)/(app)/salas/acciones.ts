"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { sincronizarEspacio } from "@/lib/discord-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";

type Resultado = { ok: true } | { ok: false; error: string };

async function usuario() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Destacar un chat (pin personal). Issue #108. */
export async function destacarChat(salaId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  const t = await getTranslations("chats.acciones");
  if (!user) return { ok: false, error: t("sinSesion") };
  // `creado_en` default now() da el orden: al re-destacar, sube. Por eso se borra y re-inserta.
  await supabase.from("chats_destacados").delete().eq("sala_id", salaId).eq("perfil_id", user.id);
  const { error } = await supabase
    .from("chats_destacados")
    .insert({ sala_id: salaId, perfil_id: user.id });
  if (error) return { ok: false, error: t("errorDestacar") };
  revalidatePath("/salas");
  return { ok: true };
}

/** Quitar el destacado de un chat. */
export async function quitarDestacadoChat(salaId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  const t = await getTranslations("chats.acciones");
  if (!user) return { ok: false, error: t("sinSesion") };
  const { error } = await supabase
    .from("chats_destacados")
    .delete()
    .eq("sala_id", salaId)
    .eq("perfil_id", user.id);
  if (error) return { ok: false, error: t("errorQuitarDestacado") };
  revalidatePath("/salas");
  return { ok: true };
}

/** Desvincularse de un chat (salir del proyecto/equipo). El dueño no puede. */
export async function desvincularmeDeSala(salaId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  const t = await getTranslations("chats.acciones");
  if (!user) return { ok: false, error: t("sinSesion") };
  const { error } = await supabase.rpc("desvincularme_de_sala", { p_sala_id: salaId });
  if (error) {
    if (error.message?.includes("dueño")) {
      return { ok: false, error: t("errorDueno") };
    }
    reportarErrorSupabase(error, { rpc: "desvincularme_de_sala", salaId, userId: user.id });
    return { ok: false, error: t("errorGenerico") };
  }
  // Ya no está en la sala: pierde el acceso a su espacio en Discord (#269).
  await sincronizarEspacio(salaId).catch(() => {});
  revalidatePath("/salas");
  return { ok: true };
}
