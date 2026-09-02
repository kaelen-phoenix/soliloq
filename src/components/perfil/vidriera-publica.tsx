import { EtiquetasDisciplina } from "./etiquetas-disciplina";
import { Imagen } from "@/components/ui/imagen";
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
}

/**
 * La vidriera anónima: fotos, experiencia o descripción, habilidades o disciplinas. Nada
 * de edad, ubicación, redes, videoreel ni denuncia — quien la ve no tiene sesión.
 */
export function VidrieraPublica({ perfil }: { perfil: PerfilPublico }) {
  return (
    <div className="flex flex-col gap-4">
      {perfil.fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {perfil.fotos.map((url, i) => (
            <Imagen
              key={i}
              src={url}
              alt={perfil.nombre}
              fill
              priority={i === 0}
              sizes="(max-width: 640px) 33vw, 220px"
              contenedorClassName="aspect-[3/4] rounded-xl"
            />
          ))}
        </div>
      )}

      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
        {perfil.nombre}
      </h1>

      {perfil.texto && (
        <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink-700">
          {perfil.texto}
        </p>
      )}

      {perfil.tipo === "creador" ? (
        <EtiquetasDisciplina disciplinas={perfil.disciplinas} otroDetalle={perfil.otro_detalle} />
      ) : (
        perfil.habilidades.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {perfil.habilidades.map((h) => (
              <span
                key={h}
                className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
              >
                {h}
              </span>
            ))}
          </div>
        )
      )}
    </div>
  );
}
