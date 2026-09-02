import { clasesDisciplina, etiquetaDisciplina } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

/**
 * El perfil artístico como etiquetas de color, en vez de una línea de texto separada por
 * puntos. El color agrupa por familia de oficio y sirve para leer de un vistazo si alguien
 * es de escena, de dirección, de diseño o de técnica.
 *
 * El nombre del oficio va siempre escrito: el color acompaña, no reemplaza. Es lo que hace
 * que la pantalla siga funcionando para quien no distingue esos tonos.
 */
export function EtiquetasDisciplina({
  disciplinas,
  otroDetalle,
  className = "",
}: {
  disciplinas: DisciplinaArtistica[];
  otroDetalle?: string | null;
  className?: string;
}) {
  if (disciplinas.length === 0) {
    return <p className={`text-sm text-texto-tenue ${className}`}>Perfil artístico sin completar</p>;
  }

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {disciplinas.map((d) => (
        <li
          key={d}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${clasesDisciplina(d)}`}
        >
          {/* "Otro" no le dice nada a nadie en un perfil público: se muestra lo que la
              persona escribió, y recién si no escribió nada cae en la etiqueta genérica. */}
          {d === "otro" && otroDetalle ? otroDetalle : etiquetaDisciplina(d)}
        </li>
      ))}
    </ul>
  );
}
