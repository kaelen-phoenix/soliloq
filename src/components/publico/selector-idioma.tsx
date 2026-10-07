"use client";

import type { Idioma } from "@/i18n/idiomas";

/**
 * Cambiar de idioma en una página pública (#237). Guarda la elección en la cookie de idioma
 * antes de navegar —el middleware la usa para decidir la versión de cada página sin prefijo— y
 * va a la URL del otro idioma. Sin JavaScript, el `href` a `/es/…` o `/en/…` hace lo mismo
 * desde el middleware.
 */
export function SelectorIdioma({
  idioma,
  ruta,
  className = "",
}: {
  idioma: Idioma;
  ruta: string;
  className?: string;
}) {
  const otro: Idioma = idioma === "es" ? "en" : "es";
  const destino = otro === "en" ? `/en${ruta}` : ruta;
  return (
    <a
      href={`/${otro}${ruta}`}
      hrefLang={otro}
      lang={otro}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        document.cookie = `NEXT_LOCALE=${otro}; path=/; max-age=31536000; samesite=lax`;
        window.location.assign(destino);
      }}
    >
      {otro === "en" ? "English" : "Español"}
    </a>
  );
}
