import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cliente con **service-role**: saltea RLS y habilita `auth.admin.*`.
 *
 * Solo en el server y solo para lo que el usuario no puede hacer contra su propia sesión.
 * Hoy: borrar la cuenta (`auth.admin.deleteUser`, que necesita service-role). Nunca
 * importar esto desde un componente cliente — la clave no lleva prefijo `NEXT_PUBLIC_`
 * justamente para que no pueda salir en el bundle.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del server");

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
