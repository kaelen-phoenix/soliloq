import { EtiquetasDisciplina } from "./etiquetas-disciplina";
import { Imagen } from "@/components/ui/imagen";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface CreadorDetalle {
  id: string;
  nombre: string;
  imagen_url: string | null;
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
  ubicacion_publica: string;
  /** #161: único campo de trayectoria — reemplaza a `descripcion`, que queda sin usar. */
  biografia: string | null;
}

/**
 * El perfil de un Creador, para quien no es su dueño: la propia pantalla `/creadores/[id]`
 * y la placa que se abre desde una tarjeta del feed (#159) muestran exactamente esto.
 */
export function PerfilCreadorDetalle({ creador }: { creador: CreadorDetalle }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {creador.imagen_url ? (
          <Imagen
            src={creador.imagen_url}
            alt={creador.nombre}
            width={64}
            height={64}
            contenedorClassName="shrink-0 rounded-full"
            fallback={
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
                {creador.nombre[0]}
              </div>
            }
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
            {creador.nombre[0]}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto">
            {creador.nombre}
          </h2>
          <EtiquetasDisciplina
            disciplinas={creador.disciplinas}
            otroDetalle={creador.otro_detalle}
            className="mt-1.5"
          />
          <p className="text-sm text-texto-tenue">{creador.ubicacion_publica}</p>
        </div>
      </div>

      {creador.biografia && (
        <section>
          <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
            Trayectoria
          </h3>
          <p className="mt-1.5 max-w-prose whitespace-pre-line text-sm leading-relaxed text-texto">
            {creador.biografia}
          </p>
        </section>
      )}
    </div>
  );
}
