import type { Database } from "@/lib/supabase/types";

/**
 * Las convocatorias definitivas que recibe el Talento (#143, #203): la lista de `/convocatoria`
 * y el aviso emergente. Lo comparten la web y la app nativa (#393).
 */

type FilaRpc = Database["public"]["Functions"]["mis_convocatorias"]["Returns"][number];

export interface FilaConvocatoria {
  convocatoriaId: string;
  esEquipo: boolean;
  iniciativaTitulo: string;
  creadorNombre: string;
  talentoFotoUrl: string | null;
  iniciativaFotoUrl: string | null;
}

/** Una fila de `mis_convocatorias`, con las fotos ya resueltas a URL pública. */
export function aFilaConvocatoria(c: FilaRpc, urlPublica: (path: string) => string): FilaConvocatoria {
  return {
    convocatoriaId: c.convocatoria_id,
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    creadorNombre: c.creador_nombre,
    talentoFotoUrl: c.talento_foto ? urlPublica(c.talento_foto) : null,
    iniciativaFotoUrl: c.iniciativa_foto ? urlPublica(c.iniciativa_foto) : null,
  };
}

/** Error de `responder_convocatoria` → clave del texto (`proyectos.convocatoria.errores`). */
export function claveErrorResponder(mensaje: string | undefined): "noDisponible" | "noSePudo" {
  return mensaje?.includes("no encontrada") ? "noDisponible" : "noSePudo";
}
