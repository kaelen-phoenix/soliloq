"use client";

import { useEffect, useState } from "react";
import es from "@/mensajes/es/cuenta.json";
import en from "@/mensajes/en/cuenta.json";

/** El idioma sin provider (#354): la cookie de Ajustes, si no el del navegador. */
function idiomaDelNavegador(): "es" | "en" {
  const cookie = document.cookie.match(/(?:^|; )NEXT_LOCALE=(es|en)/)?.[1];
  if (cookie === "es" || cookie === "en") return cookie;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}

/**
 * Último recurso: un error dentro del layout raíz, donde `error.tsx` todavía no existe.
 *
 * Reemplaza el `<html>` entero, así que no puede apoyarse en el layout ni en las fuentes
 * —no están cargadas— y por eso los estilos van en línea. Es la única pantalla de la app
 * que no usa Tailwind, y tiene que seguir siendo así: cualquier dependencia acá es una
 * dependencia que puede fallar justo cuando todo lo demás ya falló.
 *
 * Por lo mismo no usa next-intl —su provider vive en el layout que acaba de fallar—: los
 * textos salen directo de los JSON de mensajes y el idioma se resuelve en el navegador.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const [idioma, setIdioma] = useState<"es" | "en">("es");
  useEffect(() => {
    try {
      setIdioma(idiomaDelNavegador());
    } catch {
      // Queda en castellano.
    }
  }, []);
  const t = (idioma === "en" ? en : es).cuenta.errorGlobal;

  return (
    <html lang={idioma === "en" ? "en-US" : "es-AR"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 1.5rem",
          fontFamily: "Georgia, serif",
          color: "#18161a",
          background: "#fff",
        }}
      >
        <div style={{ maxWidth: "24rem", margin: "0 auto", width: "100%" }}>
          <span style={{ fontSize: "1.1875rem", fontWeight: 600 }}>Yalope</span>
          <span
            style={{
              display: "block",
              width: "1rem",
              height: "2px",
              background: "#d81b7a",
              marginTop: "0.375rem",
              borderRadius: "999px",
            }}
          />
          <h1 style={{ fontSize: "1.3125rem", marginTop: "2rem", marginBottom: 0 }}>
            {t.titulo}
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.55,
              color: "#5c565f",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {t.detalle}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.7rem 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#18161a",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            {t.reintentar}
          </button>
        </div>
      </body>
    </html>
  );
}
