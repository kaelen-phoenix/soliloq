"use client";

import { useEffect, useState } from "react";
import { mejorarRedaccion } from "@/app/acciones-ia";
import type { TipoRedaccion } from "@/lib/ia-prompts";

const MINIMO = 15;

const AYUDA: Record<TipoRedaccion, string> = {
  experiencia: "Pegá tu CV como lo tengas (aunque esté desordenado) y te lo dejamos bien redactado.",
  sinopsis: "Escribilo como te salga y te lo dejamos claro y atractivo para quien lo lea.",
  equipo: "Escribilo como te salga y te lo dejamos claro para quien lo lea.",
  rol: "Escribí cómo es el personaje y qué buscás, y te lo dejamos claro y concreto.",
};

/**
 * «✨ Mejorar redacción» (#313, #319): bajo la Experiencia, la sinopsis del Proyecto, la
 * descripción del Equipo y la de un rol. Manda el texto a la IA y muestra la propuesta;
 * recién con «Usar este texto» reemplaza lo escrito. Nada se guarda solo.
 */
export function MejorarRedaccion({
  texto,
  onUsar,
  tipo = "experiencia",
}: {
  texto: string;
  onUsar: (nuevo: string) => void;
  tipo?: TipoRedaccion;
}) {
  const [estado, setEstado] = useState<"listo" | "pensando">("listo");
  // La propuesta va con el texto del que salió: si la persona lo sigue editando, ya no aplica.
  const [propuesta, setPropuesta] = useState<{ de: string; texto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propuesta && propuesta.de !== texto) setPropuesta(null);
  }, [texto, propuesta]);

  async function pedir() {
    const de = texto;
    setEstado("pensando");
    setError(null);
    setPropuesta(null);
    try {
      const r = await mejorarRedaccion(de, tipo);
      if (!r.ok) return setError(r.error);
      setPropuesta({ de, texto: r.texto });
    } catch {
      setError("No pudimos mejorarlo ahora. Probá de nuevo.");
    } finally {
      setEstado("listo");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pedir}
        disabled={estado === "pensando" || texto.trim().length < MINIMO}
        className="self-start rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
      >
        {estado === "pensando" ? "Mejorando…" : "✨ Mejorar redacción"}
      </button>
      {texto.trim().length < MINIMO && (
        <p className="text-xs text-texto-tenue">
          {AYUDA[tipo]}
        </p>
      )}
      {error && <p className="text-xs text-error-600">{error}</p>}
      {propuesta && (
        <div className="flex flex-col gap-2 rounded-xl border border-borde bg-fondo-sutil p-3.5">
          <p className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Propuesta</p>
          <p className="whitespace-pre-line text-sm text-texto">{propuesta.texto}</p>
          <p className="text-xs text-texto-tenue">Revisala: la IA puede equivocarse.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUsar(propuesta.texto);
                setPropuesta(null);
              }}
              className="rounded-full bg-accion px-3.5 py-1.5 text-sm font-semibold text-accion-texto"
            >
              Usar este texto
            </button>
            <button
              type="button"
              onClick={() => setPropuesta(null)}
              className="rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto hover:bg-fondo-sutil"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
