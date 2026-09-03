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

/** Un bloque del booking, con el título en registro de programa de mano. */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h2 className="mb-3 font-display text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * El booking: la carta de presentación de un artista para pasarle a una directora de
 * casting. Headshot grande, nombre en la serif de display, datos de cabecera, videoreel,
 * trayectoria, habilidades y obras previas. No trae correo ni teléfono: para eso está
 * "Contactar".
 */
export function VidrieraPublica({ perfil }: { perfil: PerfilPublico }) {
  const esTalento = perfil.tipo === "talento";

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
    <article className="flex flex-col">
      {perfil.fotos.length > 0 && (
        <GaleriaFotos fotos={perfil.fotos} alt={perfil.nombre} destacarPrimera />
      )}

      <header className={perfil.fotos.length > 0 ? "mt-5" : ""}>
        <h1 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-900 sm:text-[2.5rem]">
          {perfil.nombre}
        </h1>
        {datos.length > 0 && (
          <p className="mt-2 text-sm text-ink-600">{datos.join("  ·  ")}</p>
        )}
      </header>

      {redes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {redes.map((red) => (
            <a
              key={red.clave}
              href={perfil.redes[red.clave]}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={red.etiqueta}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-800"
            >
              <Icono nombre={red.icono} className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col divide-y divide-ink-100 border-t border-ink-100">
        {perfil.videoreel_url && (
          <Seccion titulo="Videoreel">
            <VideoreelEmbed url={perfil.videoreel_url} />
          </Seccion>
        )}

        {perfil.texto && (
          <Seccion titulo={esTalento ? "Trayectoria" : "Sobre el proyecto"}>
            <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink-800">
              {perfil.texto}
            </p>
          </Seccion>
        )}

        {esTalento
          ? perfil.habilidades.length > 0 && (
              <Seccion titulo="Habilidades">
                <div className="flex flex-wrap gap-2">
                  {perfil.habilidades.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </Seccion>
            )
          : perfil.disciplinas.length > 0 && (
              <Seccion titulo="Perfil artístico">
                <EtiquetasDisciplina
                  disciplinas={perfil.disciplinas}
                  otroDetalle={perfil.otro_detalle}
                />
              </Seccion>
            )}

        {perfil.obras.length > 0 && (
          <Seccion titulo="Obras previas">
            <ul className="flex flex-col gap-2">
              {perfil.obras.map((o, i) => (
                <li key={i} className="text-sm text-ink-800">
                  <span className="font-medium text-ink-900">{o.titulo}</span>
                  <span className="text-ink-500">
                    {"  ·  "}
                    {o.anio}
                    {"  ·  "}
                  </span>
                  {o.rol}
                </li>
              ))}
            </ul>
          </Seccion>
        )}
      </div>
    </article>
  );
}
