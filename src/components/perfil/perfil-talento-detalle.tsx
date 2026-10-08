import { useTranslations } from "next-intl";
import { VideoreelEmbed } from "./videoreel-embed";
import { claveGenero, claveRed, etiquetaHabilidad, REDES, type Genero } from "@/lib/constantes";
import { GaleriaFotos } from "@/components/ui/galeria-fotos";
import { Icono } from "@/components/ui/icono";

export interface TalentoDetalle {
  id: string;
  nombre: string;
  /**
   * Ya calculada: la fecha de nacimiento no sale de la base para otras cuentas (#255). En el
   * perfil propio es la edad real; en uno ajeno, `edad_publica()` (null si la ocultó). `null`
   * también en cuentas migradas sin fecha (#175).
   */
  edad: number | null;
  /** #110: si es `false`, la edad no se muestra (tampoco en el perfil propio, #250). */
  edad_visible: boolean;
  /** La recortada a barrio/ciudad. Nunca `ubicacion_texto`: puede ser el domicilio. */
  ubicacion_publica: string | null;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  formacion?: string | null;
  habilidades: string[];
  /** `{ [claveRed]: urlCanonica }`. Se renderiza en orden de catálogo; `{}` no ocupa lugar. */
  redes: Record<string, string>;
  fotos: { id: string; url: string; orden: number }[];
}

export function PerfilTalentoDetalle({
  talento,
  esPropio = false,
}: {
  talento: TalentoDetalle;
  /**
   * En el perfil propio la edad oculta tampoco se muestra (#250: si no, la persona ve su edad
   * y cree que la opción no anda); en su lugar va un aviso de que está oculta.
   */
  esPropio?: boolean;
}) {
  const t = useTranslations("perfil.detalle");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const fotosOrdenadas = [...talento.fotos].sort((a, b) => a.orden - b.orden);
  const redes = REDES.filter((r) => talento.redes?.[r.clave]);
  const mostrarEdad = talento.edad != null && talento.edad_visible;
  const avisoEdadOculta = esPropio && talento.edad != null && !talento.edad_visible;

  return (
    <div className="flex flex-col gap-4">
      <GaleriaFotos fotos={fotosOrdenadas.map((f) => f.url)} alt={talento.nombre} />

      <div>
        <h2 className="text-lg font-bold text-texto">{talento.nombre}</h2>
        <p className="text-sm text-texto-tenue">
          {mostrarEdad && `${t("edad", { edad: talento.edad! })} · `}
          {talento.ubicacion_publica}
        </p>
        {avisoEdadOculta && <p className="text-xs text-texto-tenue">{t("edadOculta")}</p>}
        {(talento.genero_descripcion || talento.genero !== "sin_especificar") && (
          <p className="text-sm text-texto-tenue">
            {talento.genero_descripcion || tEtiquetas(claveGenero(talento.genero))}
          </p>
        )}
      </div>

      {redes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {redes.map((red) => (
            <a
              key={red.clave}
              href={talento.redes[red.clave]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tEtiquetas(claveRed(red.clave))}
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
          <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("experiencia")}</h3>
          <p className="mt-1 max-w-prose whitespace-pre-line text-sm text-texto">{talento.experiencia}</p>
        </div>
      )}

      {/* #379: si no la cargó, no aparece el apartado vacío. */}
      {talento.formacion && (
        <div>
          <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("formacion")}</h3>
          <p className="mt-1 max-w-prose whitespace-pre-line text-sm text-texto">{talento.formacion}</p>
        </div>
      )}

      {talento.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {talento.habilidades.map((h) => (
            <span key={h} className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-medium text-texto">
              {etiquetaHabilidad(h, tEtiquetas)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
