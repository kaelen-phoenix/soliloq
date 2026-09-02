import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type Nivel = "reparto" | "coproduccion" | "produccion";

const ALTURA: Record<Nivel, string> = {
  produccion: "h-12 sm:h-14",
  coproduccion: "h-9 sm:h-10",
  reparto: "h-7 sm:h-8",
};

/**
 * Franja con los logos de los sponsors activos. `niveles` acota qué niveles se muestran
 * (una franja destacada muestra solo `produccion`; el "gracias a" del pie los muestra
 * todos). Si no hay ninguno, no renderiza nada.
 */
export async function BannerSponsors({
  niveles = ["produccion", "coproduccion", "reparto"],
  titulo = true,
  className = "",
}: {
  niveles?: Nivel[];
  titulo?: boolean;
  className?: string;
}) {
  let sponsors: { id: string; nombre: string; logo_url: string; sitio_url: string | null; nivel: Nivel }[] = [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("sponsors")
      .select("id, nombre, logo_url, sitio_url, nivel")
      .eq("activo", true)
      .in("nivel", niveles)
      .order("nivel")
      .order("orden");
    sponsors = data ?? [];
  } catch {
    // Sin sponsors o sin base disponible: el banner simplemente no aparece.
  }
  if (sponsors.length === 0) return null;

  const t = await getTranslations("apoyar");

  return (
    <div className={className}>
      {titulo && (
        <p className="mb-3 text-center text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("graciasA")}
        </p>
      )}
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {sponsors.map((s) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logo_url}
              alt={s.nombre}
              className={`${ALTURA[s.nivel]} w-auto object-contain opacity-80 transition-opacity hover:opacity-100`}
            />
          );
          return (
            <li key={s.id}>
              {s.sitio_url ? (
                <a href={s.sitio_url} target="_blank" rel="noopener noreferrer nofollow" aria-label={s.nombre}>
                  {img}
                </a>
              ) : (
                img
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
