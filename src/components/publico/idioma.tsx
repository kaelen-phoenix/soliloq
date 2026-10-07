import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { esIdioma, rutaPublica, type Idioma } from "@/i18n/idiomas";

/**
 * El idioma de la URL de una página pública (#237): lo fija para next-intl (sin leer cookies
 * ni headers, así la página puede armarse una sola vez) o corta con un 404 si el primer
 * segmento no es un idioma (`/algo/normas`).
 */
export function fijarIdioma(valor: string): Idioma {
  if (!esIdioma(valor)) notFound();
  setRequestLocale(valor);
  return valor;
}

/**
 * Metadatos de idioma de una página pública (#237): la URL canónica en su idioma y las
 * alternativas `hreflang`, para que el buscador muestre a cada quien la versión de su idioma.
 * `canonicaEs` es la URL en castellano cuando no es la misma ruta (la portada vive en `/`).
 */
export function alternativasIdioma(idioma: Idioma, ruta: string, canonicaEs: string = ruta): Metadata["alternates"] {
  const en = rutaPublica("en", ruta);
  return {
    canonical: idioma === "en" ? en : canonicaEs,
    languages: { es: canonicaEs, en, "x-default": canonicaEs },
  };
}

export { SelectorIdioma } from "./selector-idioma";
