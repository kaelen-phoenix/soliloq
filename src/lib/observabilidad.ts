import * as Sentry from "@sentry/nextjs";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * El cliente de Supabase no lanza excepción en un error de query/RPC — vuelve
 * `{ data: null, error }` y listo. Sin esto, un error así se ve en la UI como "todavía no
 * hay nada" y no llega a ningún lado (así estuvo roto `mis_matches`/`mis_convocados` en
 * prod semanas enteras sin que nadie se enterara — #197/#198).
 */
export function reportarErrorSupabase(error: PostgrestError, contexto: Record<string, unknown>) {
  Sentry.captureException(new Error(`Supabase: ${error.message}`), {
    tags: { origen: "supabase", codigo: error.code },
    extra: { ...contexto, details: error.details, hint: error.hint },
  });
}
