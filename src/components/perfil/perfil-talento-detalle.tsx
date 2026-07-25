import { VideoreelEmbed } from "./videoreel-embed";
import { calcularEdad } from "@/lib/constantes";

export interface TalentoDetalle {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  locacion: string;
  videoreel_url: string | null;
  experiencia: string | null;
  habilidades: string[];
  fotos: { id: string; url: string; orden: number }[];
}

export function PerfilTalentoDetalle({ talento }: { talento: TalentoDetalle }) {
  const fotosOrdenadas = [...talento.fotos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {fotosOrdenadas.map((foto) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={foto.id} src={foto.url} alt={talento.nombre} className="aspect-[3/4] rounded-xl object-cover" />
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-ink-900">{talento.nombre}</h2>
        <p className="text-sm text-ink-500">
          {calcularEdad(talento.fecha_nacimiento)} años · {talento.locacion}
        </p>
      </div>

      {talento.videoreel_url && <VideoreelEmbed url={talento.videoreel_url} />}

      {talento.experiencia && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Experiencia</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{talento.experiencia}</p>
        </div>
      )}

      {talento.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {talento.habilidades.map((h) => (
            <span key={h} className="rounded-md bg-ink-100 px-2.5 py-1 text-[12px] font-medium text-ink-700">
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
