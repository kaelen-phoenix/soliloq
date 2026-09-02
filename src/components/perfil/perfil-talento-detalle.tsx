import { VideoreelEmbed } from "./videoreel-embed";
import { calcularEdad, etiquetaGenero, REDES, type Genero } from "@/lib/constantes";
import { GaleriaFotos } from "@/components/ui/galeria-fotos";
import { Icono } from "@/components/ui/icono";

export interface TalentoDetalle {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  /** La recortada a barrio/ciudad. Nunca `ubicacion_texto`: puede ser el domicilio. */
  ubicacion_publica: string;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  habilidades: string[];
  /** `{ [claveRed]: urlCanonica }`. Se renderiza en orden de catálogo; `{}` no ocupa lugar. */
  redes: Record<string, string>;
  fotos: { id: string; url: string; orden: number }[];
}

export function PerfilTalentoDetalle({ talento }: { talento: TalentoDetalle }) {
  const fotosOrdenadas = [...talento.fotos].sort((a, b) => a.orden - b.orden);
  const redes = REDES.filter((r) => talento.redes?.[r.clave]);

  return (
    <div className="flex flex-col gap-4">
      <GaleriaFotos fotos={fotosOrdenadas.map((f) => f.url)} alt={talento.nombre} />

      <div>
        <h2 className="text-lg font-bold text-texto">{talento.nombre}</h2>
        <p className="text-sm text-texto-tenue">
          {calcularEdad(talento.fecha_nacimiento)} años · {talento.ubicacion_publica}
        </p>
        <p className="text-sm text-texto-tenue">
          {talento.genero_descripcion || etiquetaGenero(talento.genero)}
        </p>
      </div>

      {redes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {redes.map((red) => (
            <a
              key={red.clave}
              href={talento.redes[red.clave]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={red.etiqueta}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
            >
              <Icono nombre={red.icono} className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}

      {talento.videoreel_url && <VideoreelEmbed url={talento.videoreel_url} />}

      {talento.experiencia && (
        <div>
          <h3 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Experiencia</h3>
          <p className="mt-1 max-w-prose whitespace-pre-line text-sm text-ink-700">{talento.experiencia}</p>
        </div>
      )}

      {talento.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {talento.habilidades.map((h) => (
            <span key={h} className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
