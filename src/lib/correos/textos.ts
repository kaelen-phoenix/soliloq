import { createTranslator } from "next-intl";
import type { Idioma } from "@/i18n/request";
import es from "@/mensajes/es/correos.json";
import en from "@/mensajes/en/correos.json";

/**
 * Los mails y los push salen en el idioma de quien los recibe (`perfiles.idioma`, #354), no
 * en el de quien está usando la app: no hay request del que sacarlo. Se cargan los JSON del
 * área directo (sin `mensajesDe`, que es asíncrona y vive junto a `next/headers`).
 */
export function idiomaDe(valor: string | null | undefined): Idioma {
  return valor === "en" ? "en" : "es";
}

export function textosCorreo(idioma: Idioma) {
  return createTranslator({
    locale: idioma,
    messages: (idioma === "en" ? en : es) as typeof es,
    namespace: "correos",
  });
}

/** Para fechas escritas en el mail. */
export function localeDe(idioma: Idioma) {
  return idioma === "en" ? "en-US" : "es-AR";
}
