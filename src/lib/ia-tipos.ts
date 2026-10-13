/** Los filtros que devuelve «Buscar escribiendo» (#321). Puro: lo usan la web y la app nativa. */
export interface FiltrosBusqueda {
  edadMin?: number;
  edadMax?: number;
  generos?: string[];
  habilidades?: string[];
  zona?: string;
  texto?: string;
}
