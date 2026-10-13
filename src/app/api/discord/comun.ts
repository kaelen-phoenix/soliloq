import { createHmac, timingSafeEqual } from "node:crypto";

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

// ── Vincular desde la app nativa (#395) ─────────────────────────────────────────────────
// La app no tiene las cookies de sesión de la web: pide (con su sesión) un enlace firmado que
// dice quién es, válido por 10 minutos, y al terminar Discord vuelve a la app por su esquema.

/** Los esquemas de la app a los que se puede volver: nada más. */
const ESQUEMAS_APP = ["com.yalope.app", "com.yalope.app.previa"];

export function esquemaApp(valor: string | null | undefined): string | null {
  return valor && ESQUEMAS_APP.includes(valor) ? valor : null;
}

function firma(datos: string) {
  return createHmac("sha256", process.env.DISCORD_CLIENT_SECRET ?? "").update(datos).digest("base64url");
}

/** `usuario.vence.esquema.firma`: lo arma el endpoint de la app y lo lee `/api/discord/vincular`. */
export function firmarPaseApp(usuario: string, esquema: string, vence = Date.now() + 10 * 60_000): string {
  const datos = `${usuario}.${vence}.${esquema}`;
  return `${datos}.${firma(datos)}`;
}

/** Quién pidió el pase y a qué esquema vuelve; `null` si no es válido o venció. */
export function leerPaseApp(pase: string | null | undefined): { usuario: string; esquema: string } | null {
  const partes = pase?.split(".") ?? [];
  if (partes.length !== 4) return null;
  const [usuario, vence, esquema, recibida] = partes;
  if (!/^[0-9a-f-]{36}$/.test(usuario) || !esquemaApp(esquema) || Number(vence) < Date.now()) return null;
  const esperada = Buffer.from(firma(`${usuario}.${vence}.${esquema}`));
  const dada = Buffer.from(recibida);
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return null;
  return { usuario, esquema };
}
