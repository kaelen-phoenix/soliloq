/**
 * Descargar la app de Android (#425). Mientras Yalope está en prueba interna de Google Play, para
 * bajarla hay que (1) unirse al grupo de Google de testers y (2) aceptar la prueba con esa misma
 * cuenta de Google; recién ahí Play la muestra. Cuando se publique, alcanza con `PLAY_STORE`.
 *
 * Sin dependencias: lo usan la portada, Perfil y la página `/descargar`.
 */

/** El grupo abierto de testers: cualquiera se une con su cuenta de Google. */
export const GRUPO_TESTERS = "https://groups.google.com/g/yalope";

/** El enlace de la prueba interna: se acepta con la cuenta que se unió al grupo. */
export const PRUEBA_INTERNA = "https://play.google.com/apps/internaltest/4701494538664759273";

/** La ficha de Google Play (sirve una vez aceptada la prueba, y cuando la app se publique). */
export const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.yalope.app";

/** ¿El navegador es de un teléfono o tablet Android? (`userAgent`). */
export function esAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent);
}
