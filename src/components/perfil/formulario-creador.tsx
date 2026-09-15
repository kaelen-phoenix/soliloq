"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvisoGuardado, useAvisoGuardado } from "@/components/ui/aviso-guardado";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { clasesDisciplina, DISCIPLINAS, MAX_OTRO_DETALLE } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

interface DatosIniciales {
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
}

/**
 * Edita sólo el perfil artístico (`disciplinas`/`otro_detalle`) de la función de Creador —
 * issue #175: ya no es el alta de un segundo perfil de identidad (nombre, foto, ubicación),
 * eso ahora es siempre el Perfil de Talento. La fila de `perfiles_creador` ya existe a esta
 * altura (la crea el trigger al armar el primer Proyecto o Equipo, 0075), así que este
 * formulario sólo actualiza, nunca da de alta.
 */
export function FormularioCreador({
  userId,
  datosIniciales,
}: {
  userId: string;
  datosIniciales: DatosIniciales;
}) {
  const router = useRouter();
  const [disciplinas, setDisciplinas] = useState<DisciplinaArtistica[]>(
    datosIniciales.disciplinas
  );
  const [otroDetalle, setOtroDetalle] = useState(datosIniciales.otro_detalle ?? "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useAvisoGuardado();

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (disciplinas.length === 0) nuevos.disciplinas = "Elegí al menos una.";
    if (disciplinas.includes("otro") && otroDetalle.trim().length < 2) {
      nuevos.otroDetalle = "Contanos qué hacés.";
    }
    setErrores((prev) => ({ ...prev, ...nuevos }));
    return Object.keys(nuevos).length === 0;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setGuardado(false);
    if (!validar()) return;

    setCargando(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("perfiles_creador")
      .update({
        disciplinas,
        // El detalle solo se guarda si "Otro" sigue elegido: si la persona lo desmarca, el
        // texto tiene que irse con él en vez de quedar colgado sin nada que lo explique.
        otro_detalle: disciplinas.includes("otro") ? otroDetalle.trim() : null,
      })
      .eq("id", userId);

    if (error) {
      setCargando(false);
      setErrorGeneral("No pudimos guardar los cambios. Probá de nuevo.");
      return;
    }

    router.refresh();
    setCargando(false);
    setGuardado(true);
  }

  return (
    <form onSubmit={guardar} className="flex max-w-2xl flex-col gap-4">
      {/* Es múltiple porque en el medio se hace más de una cosa: quien dirige también
          actúa, y obligar a elegir una sola falsea el perfil. */}
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
                    elegida ? prev.filter((v) => v !== d.valor) : [...prev, d.valor]
                  )
                }
                // Elegida toma el color de su familia de oficio, no el negro genérico: así
                // se ve de un vistazo a qué grupo pertenece lo que estás marcando.
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

        {errores.disciplinas && <p className="text-xs text-error-600">{errores.disciplinas}</p>}

        {disciplinas.includes("otro") && (
          <CampoTexto
            id="otro-detalle"
            etiqueta="¿Qué hacés?"
            value={otroDetalle}
            maxLength={MAX_OTRO_DETALLE}
            placeholder="Por ejemplo: titiritera, técnica de vuelo"
            onChange={(e) => setOtroDetalle(e.target.value)}
            error={errores.otroDetalle}
          />
        )}
      </fieldset>

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

      <AvisoGuardado visible={guardado} />

      <Boton type="submit" cargando={cargando}>
        Guardar cambios
      </Boton>
    </form>
  );
}
