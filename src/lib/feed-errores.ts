/**
 * Errores de la base al decidir en el feed → clave del texto (`proyectos.pila`). Los comparten
 * la web (`pila-tarjetas.tsx`) y la app nativa (#393).
 */

/** «Me interesa» / «Paso»: puede rebotar por el límite de 20 por día (`limite_me_interesa`). */
export function claveErrorInteres(mensaje: string | undefined): "limiteMeInteresa" | "errorDecision" {
  return mensaje?.includes("limite_me_interesa") ? "limiteMeInteresa" : "errorDecision";
}

/** «Deshacer»: si ya hay match con ese proyecto, la base no deja. */
export function claveErrorDeshacer(mensaje: string | undefined): "deshacerConMatch" | "errorDeshacer" {
  return mensaje?.includes("match") ? "deshacerConMatch" : "errorDeshacer";
}
