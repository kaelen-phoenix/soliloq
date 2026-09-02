import type { SupabaseClient } from "@supabase/supabase-js";
import { resolverEstadoCuenta, type EstadoCuenta } from "./cuenta";
import type { Database } from "./supabase/types";

/**
 * Lee de la base todo lo necesario para resolver el estado de la cuenta.
 * Se usa tanto en el middleware como en los layouts, para que ambos decidan
 * exactamente con el mismo criterio.
 */
export async function leerEstadoCuenta(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<EstadoCuenta> {
  const [{ data: perfil }, { count: talento }, { count: creador }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("rol, modo_activo, es_admin, suspendido_en")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("perfiles_talento").select("id", { count: "exact", head: true }).eq("id", userId),
    supabase.from("perfiles_creador").select("id", { count: "exact", head: true }).eq("id", userId),
  ]);

  return resolverEstadoCuenta(perfil, (talento ?? 0) > 0, (creador ?? 0) > 0);
}
