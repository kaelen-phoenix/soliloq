"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

/** El Talento acepta o rechaza una convocatoria (issue #106). */
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
      error: error.message?.includes("cupo_lleno")
        ? "El proyecto ya llenó su cupo."
        : "No se pudo aplicar. Probá de nuevo.",
    };
  }
  revalidatePath("/convocado");
  revalidatePath("/salas");
  return { ok: true };
}
