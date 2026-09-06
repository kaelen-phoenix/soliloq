"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  if (!user) return { ok: false, error: "Sin sesión." };
  // `creado_en` default now() da el orden: al re-destacar, sube. Por eso se borra y re-inserta.
  await supabase.from("chats_destacados").delete().eq("sala_id", salaId).eq("perfil_id", user.id);
  const { error } = await supabase
    .from("chats_destacados")
    .insert({ sala_id: salaId, perfil_id: user.id });
  if (error) return { ok: false, error: "No se pudo destacar." };
  revalidatePath("/salas");
  return { ok: true };
}

/** Quitar el destacado de un chat. */
export async function quitarDestacadoChat(salaId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { ok: false, error: "Sin sesión." };
  const { error } = await supabase
    .from("chats_destacados")
    .delete()
    .eq("sala_id", salaId)
    .eq("perfil_id", user.id);
  if (error) return { ok: false, error: "No se pudo quitar el destacado." };
  revalidatePath("/salas");
  return { ok: true };
}

/** Desvincularse de un chat (salir del proyecto/equipo). El dueño no puede. */
export async function desvincularmeDeSala(salaId: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { ok: false, error: "Sin sesión." };
  const { error } = await supabase.rpc("desvincularme_de_sala", { p_sala_id: salaId });
  if (error) {
    return {
      ok: false,
      error: error.message?.includes("dueño")
        ? "No podés desvincularte de tu propio proyecto o equipo."
        : "No se pudo aplicar. Probá de nuevo.",
    };
  }
  revalidatePath("/salas");
  return { ok: true };
}
