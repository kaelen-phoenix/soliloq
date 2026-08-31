import Link from "next/link";

export interface ResultadoTalento {
  id: string;
  nombre: string;
  edad: number;
  ubicacion_publica: string;
  habilidades: string[];
  fotoUrl: string;
}

/**
 * Tarjeta del buscador: la foto manda. Nombre, edad, ubicación y habilidades van en
 * segundo plano —son para descartar, no para elegir; eso pasa al abrir el perfil.
 */
export function TarjetaTalento({ talento }: { talento: ResultadoTalento }) {
  return (
    <Link
      href={`/talentos/${talento.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-colors hover:border-ink-300"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={talento.fotoUrl}
        alt={talento.nombre}
        className="aspect-[3/4] w-full object-cover"
      />
      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-semibold text-ink-900">{talento.nombre}</p>
        <p className="text-xs text-ink-500">
          {talento.edad} años · {talento.ubicacion_publica}
        </p>
        {talento.habilidades.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {talento.habilidades.map((h) => (
              <span key={h} className="rounded-md bg-ink-100 px-2 py-0.5 text-2xs font-medium text-ink-600">
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
