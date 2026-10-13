/**
 * Los tipos del feed de Explorar (las tarjetas de la pila), compartidos por la web
 * (`components/feed/*`) y la app nativa (`movil/src/ui/explorar/*`, #393).
 */

export interface RolFeed {
  rol_id: string;
  rol_nombre: string;
  rol_tipo: string;
  edad_minima: number | null;
  edad_maxima: number | null;
  rol_descripcion: string | null;
  vacantes: number;
  obra_id: string;
  obra_titulo: string;
  obra_sinopsis: string | null;
  obra_ubicacion_texto: string;
  creador_id: string;
  creador_nombre: string;
  creador_imagen_url: string | null;
  /** URLs ya resueltas de las fotos de la obra (0048). Puede venir vacío. */
  fotos?: string[];
  /** Tarjeta del onboarding, no una convocatoria real. Ver `lib/onboarding-ejemplo.ts`. */
  es_ejemplo?: boolean;
}

export interface EquipoFeed {
  equipo_id: string;
  titulo: string;
  /** null = sin límite de integrantes (#330). */
  cupo: number | null;
  creador_id: string;
  creador_nombre: string;
  creador_imagen_url: string | null;
  /** URLs ya resueltas. Al menos 1 (lo garantiza `feed_equipos_para_talento`). */
  fotos: string[];
}

export type Decision = "postular" | "descartar";

// La pila mezcla dos cosas: roles de un proyecto y equipos. Se etiquetan para que la
// tarjeta y la decisión sepan con qué están tratando.
export type ItemFeed = { kind: "rol"; data: RolFeed } | { kind: "equipo"; data: EquipoFeed };

/** Cuánto hay que arrastrar la tarjeta para que cuente como decisión. */
export const UMBRAL_SWIPE = 120;
