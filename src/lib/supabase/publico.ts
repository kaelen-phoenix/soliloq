import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cliente anónimo y sin cookies, para lo que cualquiera puede ver (los sponsors del pie). A
 * diferencia de `server.ts`, no lee la sesión del request: así las páginas públicas que lo usan
 * siguen pudiendo armarse una sola vez y cachearse (#237). Aplica las políticas de `anon`.
 */
export function createClientPublico() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
