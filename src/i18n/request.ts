import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Resuelve `es`/`en` desde el header `Accept-Language`. Cualquier cosa que no sea inglés → español. */
export function detectarIdioma(acceptLanguage: string | null | undefined): Idioma {
  const primero = acceptLanguage?.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return primero === "en" ? "en" : "es";
}

/** El idioma efectivo del request: la cookie `NEXT_LOCALE` si es válida, si no la detección por header. */
export function resolverIdioma(): Idioma {
  const cookie = cookies().get("NEXT_LOCALE")?.value;
  if (cookie === "es" || cookie === "en") return cookie;
  return detectarIdioma(headers().get("accept-language"));
}

/**
 * Los textos de cada área viven en su propio archivo (`mensajes/<idioma>/<área>.json`, #354),
 * con un namespace del mismo nombre, y se suman a los generales de `mensajes/<idioma>.json`.
 */
export const AREAS = ["perfil", "proyectos", "chats", "cuenta", "admin", "correos"] as const;

export async function mensajesDe(idioma: Idioma) {
  const [general, ...areas] = await Promise.all([
    import(`@/mensajes/${idioma}.json`),
    ...AREAS.map((area) => import(`@/mensajes/${idioma}/${area}.json`)),
  ]);
  return Object.assign({}, general.default, ...areas.map((m) => m.default));
}

export default getRequestConfig(async () => {
  const locale = resolverIdioma();
  return { locale, messages: await mensajesDe(locale) };
});
