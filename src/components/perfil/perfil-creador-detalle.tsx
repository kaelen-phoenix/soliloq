import { EtiquetasDisciplina } from "./etiquetas-disciplina";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface CreadorDetalle {
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
}

/**
 * El perfil artístico de la función de Creador (`disciplinas`/`otro_detalle`) — issue #175:
 * ya no es una identidad aparte (nombre/foto/ubicación), eso lo muestra siempre el Perfil de
 * Talento. Se usa como sección adicional en la vista propia de `/perfil` cuando la función de
 * Creador está activa.
 */
export function PerfilCreadorDetalle({ creador }: { creador: CreadorDetalle }) {
  return (
    <section>
      <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
        Perfil artístico como Creador
      </h3>
      <EtiquetasDisciplina
        disciplinas={creador.disciplinas}
        otroDetalle={creador.otro_detalle}
        className="mt-1.5"
      />
    </section>
  );
}
