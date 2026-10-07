import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { detectarIdioma, esIdioma, type Idioma } from "./idiomas";

export { IDIOMAS, IDIOMA_POR_DEFECTO, detectarIdioma, type Idioma } from "./idiomas";

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

export default getRequestConfig(async ({ requestLocale }) => {
  // Las páginas públicas fijan su idioma con `setRequestLocale` (viene de la URL, #237): así
  // no se leen cookies ni headers y pueden armarse una sola vez. El resto de la app no lo fija
  // y sigue con la cookie de Ajustes.
  const fijado = await requestLocale;
  const locale = esIdioma(fijado) ? fijado : resolverIdioma();
  return { locale, messages: await mensajesDe(locale) };
});
