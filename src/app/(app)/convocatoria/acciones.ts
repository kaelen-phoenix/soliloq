"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

/** El Talento acepta o rechaza una convocatoria definitiva (issue #143). */
export async function responderConvocatoria(
  convocatoriaId: string,
  aceptar: boolean,
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("responder_convocatoria", {
    p_convocatoria_id: convocatoriaId,
    p_aceptar: aceptar,
  });
  if (error) {
    return {
      ok: false,
      error: error.message?.includes("no encontrada")
        ? "Esa convocatoria ya no está disponible."
        : "No se pudo aplicar. Probá de nuevo.",
    };
  }
  revalidatePath("/convocatoria");
  revalidatePath("/salas");
  return { ok: true };
}
