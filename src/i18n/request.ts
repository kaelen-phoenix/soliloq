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

export default getRequestConfig(async () => {
  const locale = resolverIdioma();
  return {
    locale,
    messages: (await import(`@/mensajes/${locale}.json`)).default,
  };
});
