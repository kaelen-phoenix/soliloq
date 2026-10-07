/**
 * Idiomas y rutas por idioma (#237). Sin dependencias de Next: lo usan el middleware, las
 * páginas y `request.ts`.
 *
 * Las páginas públicas (portada, Normas, Apoyar, Privacidad, Términos) llevan el idioma en
 * la URL para poder armarse una sola vez y cachearse: en castellano sin prefijo
 * (`/privacidad`) y en inglés con `/en` (`/en/privacidad`). Por dentro las dos viven en
 * `app/[idioma]/…`: el middleware reescribe `/privacidad` a `/es/privacidad`. El resto de la
 * app sigue con el idioma de Ajustes (cookie `NEXT_LOCALE`), como siempre.
 */
export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === "es" || valor === "en";
}

/** Resuelve `es`/`en` desde el header `Accept-Language`. Cualquier cosa que no sea inglés → español. */
export function detectarIdioma(acceptLanguage: string | null | undefined): Idioma {
  const primero = acceptLanguage?.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return primero === "en" ? "en" : "es";
}

/** Las páginas públicas con el idioma en la URL. */
export const RUTAS_POR_IDIOMA = ["/bienvenida", "/normas", "/apoyar", "/privacidad", "/terminos"] as const;

export function esRutaPorIdioma(path: string): boolean {
  return RUTAS_POR_IDIOMA.some((r) => path === r || path.startsWith(`${r}/`));
}

/** La URL de una página pública en un idioma: `/privacidad` o `/en/privacidad`. */
export function rutaPublica(idioma: string, ruta: string): string {
  return idioma === "en" ? `/en${ruta}` : ruta;
}

/** `/en/normas` → `{ idioma: "en", resto: "/normas" }`; sin prefijo, `idioma` es null. */
export function separarIdioma(path: string): { idioma: Idioma | null; resto: string } {
  const m = path.match(/^\/(es|en)(\/.*)?$/);
  if (!m) return { idioma: null, resto: path };
  return { idioma: m[1] as Idioma, resto: m[2] ?? "/" };
}
