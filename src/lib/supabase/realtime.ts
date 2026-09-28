import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Abre un canal de Realtime **después** de que el cliente tenga la sesión (#222).
 *
 * En una carga completa de página el cliente del navegador todavía no leyó la sesión de las
 * cookies cuando los componentes montan: si el canal se une en ese momento, el `phx_join`
 * sale sin `access_token`, Realtime evalúa RLS como anónimo y no entrega ningún evento.
 * `setAuth()` sin argumento toma el token de la sesión y sigue el refresco del token.
 *
 * Devuelve la función de limpieza para el `useEffect`: si el componente se desmonta antes
 * de que llegue la sesión, el canal ni se abre.
 */
export function suscribirConSesion(
  supabase: SupabaseClient<any, any, any>,
  abrir: () => RealtimeChannel,
): () => void {
  let cancelado = false;
  let canal: RealtimeChannel | null = null;

  (async () => {
    await supabase.auth.getSession();
    await supabase.realtime.setAuth();
    if (!cancelado) canal = abrir();
  })();

  return () => {
    cancelado = true;
    if (canal) supabase.removeChannel(canal);
  };
}
