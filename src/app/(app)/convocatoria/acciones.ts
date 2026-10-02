"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { sincronizarEspaciosDe } from "@/lib/discord-servidor";

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
    if (error.message?.includes("no encontrada")) {
      return { ok: false, error: "Esa convocatoria ya no está disponible." };
    }
    reportarErrorSupabase(error, { rpc: "responder_convocatoria", convocatoriaId, aceptar });
    return { ok: false, error: "No se pudo aplicar. Probá de nuevo." };
  }
  // Si aceptó, ya está en la sala: entra también al espacio de Discord, si hay (#269).
  if (aceptar) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await sincronizarEspaciosDe(user.id).catch(() => {});
  }
  revalidatePath("/convocatoria");
  revalidatePath("/salas");
  return { ok: true };
}
