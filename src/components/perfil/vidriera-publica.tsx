import { EtiquetasDisciplina } from "./etiquetas-disciplina";
import { VideoreelEmbed } from "./videoreel-embed";
import { GaleriaFotos } from "@/components/ui/galeria-fotos";
import { Icono } from "@/components/ui/icono";
import { etiquetaGenero, REDES, type Genero } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface PerfilPublico {
  tipo: "talento" | "creador";
  nombre: string;
  texto: string | null;
  habilidades: string[];
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
  /** URLs ya resueltas (`getPublicUrl` para talento; ya son URL completa para creador). */
  fotos: string[];
  ubicacion_publica: string | null;
  /** Solo talento: años cumplidos, ya calculados. Nunca la fecha. */
  edad: number | null;
  genero: string | null;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  /** `{ [claveRed]: urlCanonica }`. */
  redes: Record<string, string>;
  /** Solo creador. */
  obras: { titulo: string; anio: number; rol: string }[];
}

/**
 * El booking: la carta de presentación de un artista para pasarle a una directora de
 * casting. Fotos ampliables, datos de cabecera (edad, ciudad, género), experiencia,
 * videoreel, redes y obras previas. No trae correo ni teléfono: para eso está "Contactar".
 */
export function VidrieraPublica({ perfil }: { perfil: PerfilPublico }) {
  const generoTexto =
    perfil.genero_descripcion ||
    (perfil.genero && perfil.genero !== "sin_especificar"
      ? etiquetaGenero(perfil.genero as Genero)
      : "");

  const datos = [
    perfil.edad !== null ? `${perfil.edad} años` : null,
    perfil.ubicacion_publica,
    generoTexto || null,
  ].filter(Boolean);

  const redes = REDES.filter((r) => perfil.redes?.[r.clave]);

  return (
    <div className="flex flex-col gap-5">
      {perfil.fotos.length > 0 && (
        <GaleriaFotos fotos={perfil.fotos} alt={perfil.nombre} />
      )}

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-texto">
          {perfil.nombre}
        </h1>
        {datos.length > 0 && (
          <p className="mt-1 text-sm text-texto-tenue">{datos.join(" · ")}</p>
        )}
      </div>

      {redes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {redes.map((red) => (
            <a
              key={red.clave}
              href={perfil.redes[red.clave]}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={red.etiqueta}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
            >
              <Icono nombre={red.icono} className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}

      {perfil.videoreel_url && <VideoreelEmbed url={perfil.videoreel_url} />}

      {perfil.texto && (
        <div>
          <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">
            {perfil.tipo === "talento" ? "Experiencia" : "Sobre"}
          </h2>
          <p className="mt-1 max-w-prose whitespace-pre-line text-sm leading-relaxed text-texto">
            {perfil.texto}
          </p>
        </div>
      )}

      {perfil.tipo === "creador" ? (
        <EtiquetasDisciplina disciplinas={perfil.disciplinas} otroDetalle={perfil.otro_detalle} />
      ) : (
        perfil.habilidades.length > 0 && (
          <div>
            <h2 className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-400">
              Habilidades
            </h2>
            <div className="flex flex-wrap gap-2">
              {perfil.habilidades.map((h) => (
                <span
                  key={h}
                  className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-medium text-texto"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )
      )}

      {perfil.obras.length > 0 && (
        <div>
          <h2 className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-400">
            Obras previas
          </h2>
          <ul className="flex flex-col gap-1.5">
            {perfil.obras.map((o, i) => (
              <li key={i} className="text-sm text-texto">
                <span className="font-medium text-texto">{o.titulo}</span>
                <span className="text-ink-400"> · {o.anio} · </span>
                {o.rol}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
