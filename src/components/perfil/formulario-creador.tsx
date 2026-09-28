"use client";

import { CampoTexto } from "@/components/ui/campo-texto";
import { clasesDisciplina, DISCIPLINAS, MAX_OTRO_DETALLE } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface DatosCreador {
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
}

/**
 * Errores del perfil artístico, con claves propias para no pisar las del Talento.
 *
 * "Al menos una" solo se exige si ya tenía alguna (`exigirUna`): la fila de Creador la crea
 * un trigger sin disciplinas (0075), y ahora que esto va en el mismo formulario que el
 * Perfil de Talento, exigirla siempre dejaría a esas cuentas sin poder guardar nada.
 */
export function validarCreador(
  disciplinas: DisciplinaArtistica[],
  otroDetalle: string,
  { exigirUna }: { exigirUna: boolean },
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (exigirUna && disciplinas.length === 0) errores.creador_disciplinas = "Elegí al menos una.";
  if (disciplinas.includes("otro") && otroDetalle.trim().length < 2) {
    errores.creador_otro_detalle = "Contanos qué hacés.";
  }
  return errores;
}

/**
 * El perfil artístico (`disciplinas`/`otro_detalle`) de la función de Creador — issue #175:
 * ya no es un segundo perfil de identidad (nombre, foto, ubicación), eso es siempre el
 * Perfil de Talento. La fila de `perfiles_creador` la crea el trigger al armar el primer
 * Proyecto o Equipo (0075), así que acá solo se edita.
 *
 * Son campos sueltos, sin `<form>` ni botón propio: viven dentro de `FormularioTalento` y se
 * guardan con su único «Guardar cambios». Antes era un formulario aparte con su propio botón,
 * y la pantalla terminaba con dos «Guardar cambios» — y apretar el de arriba no guardaba
 * lo que se había tocado abajo (#234).
 */
export function CamposCreador({
  disciplinas,
  setDisciplinas,
  otroDetalle,
  setOtroDetalle,
  errores,
}: {
  disciplinas: DisciplinaArtistica[];
  setDisciplinas: React.Dispatch<React.SetStateAction<DisciplinaArtistica[]>>;
  otroDetalle: string;
  setOtroDetalle: (valor: string) => void;
  errores: Record<string, string>;
}) {
  return (
    // Es múltiple porque en el medio se hace más de una cosa: quien dirige también actúa, y
    // obligar a elegir una sola falsea el perfil.
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-sm font-medium text-texto">
        Perfil artístico como Creador
        <span className="ml-1.5 font-normal text-texto-tenue">Elegí todo lo que hagas</span>
      </legend>

      <div className="flex flex-wrap gap-2">
        {DISCIPLINAS.map((d) => {
          const elegida = disciplinas.includes(d.valor);
          return (
            <button
              key={d.valor}
              type="button"
              aria-pressed={elegida}
              onClick={() =>
                setDisciplinas((prev) =>
                  elegida ? prev.filter((v) => v !== d.valor) : [...prev, d.valor],
                )
              }
              // Elegida toma el color de su familia de oficio, no el negro genérico: así se
              // ve de un vistazo a qué grupo pertenece lo que estás marcando.
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                elegida
                  ? `border-transparent font-medium ${clasesDisciplina(d.valor)}`
                  : "border-borde text-texto-tenue hover:border-ink-300"
              }`}
            >
              {d.etiqueta}
            </button>
          );
        })}
      </div>

      {errores.creador_disciplinas && (
        <p className="text-xs text-error-600">{errores.creador_disciplinas}</p>
      )}

      {disciplinas.includes("otro") && (
        <CampoTexto
          id="otro-detalle"
          etiqueta="¿Qué hacés?"
          value={otroDetalle}
          maxLength={MAX_OTRO_DETALLE}
          placeholder="Por ejemplo: titiritera, técnica de vuelo"
          onChange={(e) => setOtroDetalle(e.target.value)}
          error={errores.creador_otro_detalle}
        />
      )}
    </fieldset>
  );
}
