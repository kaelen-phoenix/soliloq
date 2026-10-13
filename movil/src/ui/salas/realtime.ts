import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";

/**
 * Abre un canal de Realtime **después** de que el cliente tenga la sesión, como
 * `suscribirConSesion` de la web (#222): si el canal se une antes, el `phx_join` sale sin
 * token, Realtime evalúa RLS como anónimo y no entrega nada. (No se comparte el archivo de la
 * web: importa paquetes, y la app tiene su propia copia de supabase-js.)
 *
 * Devuelve la limpieza para el `useEffect`: si se desmonta antes, el canal ni se abre.
 */
export function suscribirConSesion(abrir: () => RealtimeChannel): () => void {
  let cancelado = false;
  let canal: RealtimeChannel | null = null;
  (async () => {
    await supabase.auth.getSession();
    await supabase.realtime.setAuth();
    if (!cancelado) canal = abrir();
  })().catch(() => {
    // Sin sesión confirmada no se abre: la pantalla sigue con lo que cargó, sin el vivo.
  });
  return () => {
    cancelado = true;
    if (canal) supabase.removeChannel(canal);
  };
}
