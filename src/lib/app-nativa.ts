/**
 * Las apps de Android y iPhone (#387) son Yalope adentro de Capacitor: abren `yalope.com` y
 * suman esta marca al user agent (`capacitor.config.ts`), para que el servidor y el CSS sepan
 * que la página corre dentro de la app. Sin dependencias: lo importa también el middleware.
 */
export const MARCA_APP = "YalopeApp";

/** El esquema propio de la app: el login con Google vuelve por `com.yalope.app://auth/callback`. */
export const ESQUEMA_APP = "com.yalope.app";
export const CALLBACK_APP = `${ESQUEMA_APP}://auth/callback`;

export function esUserAgentDeApp(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(MARCA_APP);
}

/** En el navegador: ¿esta página corre dentro de la app? */
export function esAppNativa(): boolean {
  return typeof navigator !== "undefined" && esUserAgentDeApp(navigator.userAgent);
}
