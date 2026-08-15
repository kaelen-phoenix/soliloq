"use client";

/**
 * Último recurso: un error dentro del layout raíz, donde `error.tsx` todavía no existe.
 *
 * Reemplaza el `<html>` entero, así que no puede apoyarse en el layout ni en las fuentes
 * —no están cargadas— y por eso los estilos van en línea. Es la única pantalla de la app
 * que no usa Tailwind, y tiene que seguir siendo así: cualquier dependencia acá es una
 * dependencia que puede fallar justo cuando todo lo demás ya falló.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-AR">
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
            Se nos cayó el telón
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.55,
              color: "#5c565f",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Algo falló al cargar la aplicación. Probá de nuevo en un momento.
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
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
