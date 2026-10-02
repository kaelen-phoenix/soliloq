/**
 * Dirección del sitio para el OAuth de Discord (#269). Fija y no de `NEXT_PUBLIC_SITE_URL`: la
 * vuelta tiene que coincidir exacto con la registrada en el portal de Discord
 * (`https://yalope.com/api/discord/callback`), y un valor distinto en esa variable (otro
 * dominio, una barra al final) hacía que Discord rechazara la vinculación sin volver nunca.
 */
export const SITIO = "https://yalope.com";

export function redirectDiscord() {
  return `${SITIO}/api/discord/callback`;
}
