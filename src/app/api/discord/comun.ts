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

/** Adónde volver después de vincular (#296): solo un chat de la app, para no abrir una
 *  redirección a cualquier lado. */
export function destinoVuelta(valor: string | null | undefined): string | null {
  return valor && /^\/salas\/[0-9a-f-]{36}$/.test(valor) ? valor : null;
}
