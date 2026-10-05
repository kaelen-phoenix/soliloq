import type { RolFeed } from "@/components/feed/tarjeta-rol";
import type { Database } from "@/lib/supabase/types";

type FilaFeed = Database["public"]["Functions"]["feed_para_talento"]["Returns"][number];

/**
 * Una fila de `feed_para_talento` → tarjeta del feed. La función devuelve la vista
 * `feed_talento`, y Postgres da toda columna de una vista como anulable aunque salga de un
 * join interno: id, nombre y tipo del rol, la obra y el creador nunca vienen en null (#353).
 * Las fotos llegan como rutas de Storage y se resuelven acá a URL pública.
 */
export function aRolFeed(r: FilaFeed, urlPublica: (path: string) => string): RolFeed {
  return {
    rol_id: r.rol_id!,
    rol_nombre: r.rol_nombre!,
    rol_tipo: r.rol_tipo!,
    edad_minima: r.edad_minima,
    edad_maxima: r.edad_maxima,
    rol_descripcion: r.rol_descripcion,
    vacantes: r.vacantes!,
    obra_id: r.obra_id!,
    obra_titulo: r.obra_titulo!,
    obra_sinopsis: r.obra_sinopsis,
    obra_ubicacion_texto: r.obra_ubicacion_texto!,
    creador_id: r.creador_id!,
    creador_nombre: r.creador_nombre!,
    creador_imagen_url: r.creador_foto_path ? urlPublica(r.creador_foto_path) : null,
    fotos: (r.obra_fotos ?? []).map(urlPublica),
  };
}
