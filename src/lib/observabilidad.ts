import * as Sentry from "@sentry/nextjs";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * El cliente de Supabase no lanza excepción en un error de query/RPC — vuelve
 * `{ data: null, error }` y listo. Sin esto, un error así se ve en la UI como "todavía no
 * hay nada" y no llega a ningún lado (así estuvo roto `mis_matches`/`mis_convocados` en
 * prod semanas enteras sin que nadie se enterara — #197/#198).
 */
/**
 * Un corte de red del lado de quien usa la app (el celular sin señal, la app en segundo plano,
 * el navegador cancelando el pedido): no es un error de la app y no se puede arreglar desde
 * acá. Ensuciaba Sentry (#285: el contador de no leídos de cada celular que perdía señal).
 */
const CORTE_DE_RED = /failed to fetch|load failed|networkerror|network error|the network connection was lost/i;

export function esCorteDeRed(error: { message?: string; details?: string | null }) {
  return CORTE_DE_RED.test(`${error.message ?? ""} ${error.details ?? ""}`);
}

export function reportarErrorSupabase(error: PostgrestError, contexto: Record<string, unknown>) {
  if (esCorteDeRed(error)) return;
  Sentry.captureException(new Error(`Supabase: ${error.message}`), {
    tags: { origen: "supabase", codigo: error.code },
    extra: { ...contexto, details: error.details, hint: error.hint },
  });
}
