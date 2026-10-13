import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarBienvenidasPendientes } from "@/lib/bienvenida-servidor";
import type { Database } from "@/lib/supabase/types";

/**
 * Aceptar las Normas de la Comunidad (#180). Lo usan la web (`acciones-normas.ts`) y la app
 * nativa (`/api/app/normas`).
 */
export async function registrarNormasAceptadas(supabase: SupabaseClient<Database>, userId: string) {
  const { error } = await supabase
    .from("perfiles")
    .update({ normas_aceptadas_en: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false as const };

  // Toda cuenta pasa por acá una sola vez, apenas puede entrar: es el momento del mail de
  // bienvenida (#272). Si falla no frena la entrada: queda pendiente y sale con el envío
  // del panel.
  try {
    await enviarBienvenidasPendientes({ soloPerfil: userId });
  } catch {
    // sigue
  }
  return { ok: true as const };
}
