/**
 * Coordinación de las notificaciones en el navegador (#347).
 *
 * - `avisarCambioNotificaciones()`: la lista avisa que marcó algo como leído y la campanita
 *   recuenta en el momento, sin esperar a Realtime.
 * - `cerrarPushDe()`: al leer en la app un aviso que también llegó como push, se cierra la
 *   notificación del sistema (si no, quedaba en la barra del teléfono aunque ya estuviera leída).
 */
export const EVENTO_NOTIFICACIONES = "yalope:notificaciones";

export function avisarCambioNotificaciones() {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));
}

/** El `tag` con que se mandó la push de cada tipo (ver `despacharAvisosDeAcceso`). */
export function tagPush(n: { tipo: string; de_perfil?: string | null }): string | null {
  if (n.tipo === "acceso_habilitado") return "acceso-habilitado";
  if (n.tipo === "solicitud_acceso") return `solicitud-${n.de_perfil ?? "acceso"}`;
  return null;
}

/** Cierra las push con esos tags. Sin service worker o sin permiso, no hace nada. */
export async function cerrarPushDe(tags: (string | null)[]) {
  const buscados = new Set(tags.filter((t): t is string => !!t));
  if (buscados.size === 0 || !("serviceWorker" in navigator)) return;
  try {
    const registro = await navigator.serviceWorker.getRegistration();
    const abiertas = (await registro?.getNotifications()) ?? [];
    for (const n of abiertas) if (n.tag && buscados.has(n.tag)) n.close();
  } catch {
    // Nada que cerrar.
  }
}
