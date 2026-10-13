import { router, type Href } from "expo-router";
import { abrirWeb } from "./web";

/**
 * Abre en la app una ruta de la web (la de una notificación o una push). Las que en la app son
 * otra cosa se traducen, y las que solo existen en la web se abren en el navegador.
 */
export function abrirDestino(destino: string) {
  if (destino === "/matches") return router.push("/convocatorias" as Href);
  if (destino === "/admin") return abrirWeb("/admin");
  if (!destino.startsWith("/")) return;
  router.push(destino as Href);
}
