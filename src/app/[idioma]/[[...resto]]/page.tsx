import { notFound } from "next/navigation";

/**
 * Cualquier URL que no existe (#237). Con dos layouts raíz no hay un `not-found` global: el
 * primer segmento de una URL inventada cae en `[idioma]`, y esta página la corta con un 404
 * que muestra `[idioma]/not-found.tsx` (la misma pantalla que el resto de la app).
 */
export default function RutaInexistente() {
  notFound();
}
