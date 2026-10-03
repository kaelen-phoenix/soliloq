"use client";

import { useState } from "react";
import { mejorarRedaccion } from "@/app/acciones-ia";

/**
 * «✨ Mejorar redacción» bajo la Experiencia (#313): manda el texto a la IA y muestra la
 * propuesta; recién con «Usar este texto» reemplaza lo escrito. Nada se guarda solo.
 */
export function MejorarRedaccion({ texto, onUsar }: { texto: string; onUsar: (nuevo: string) => void }) {
  const [estado, setEstado] = useState<"listo" | "pensando">("listo");
  const [propuesta, setPropuesta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pedir() {
    setEstado("pensando");
    setError(null);
    setPropuesta(null);
    const r = await mejorarRedaccion(texto);
    setEstado("listo");
    if (!r.ok) return setError(r.error);
    setPropuesta(r.texto);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pedir}
        disabled={estado === "pensando" || texto.trim().length < 20}
        className="self-start rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
      >
        {estado === "pensando" ? "Mejorando…" : "✨ Mejorar redacción"}
      </button>
      {texto.trim().length < 20 && (
        <p className="text-xs text-texto-tenue">
          Pegá tu CV como lo tengas (aunque esté desordenado) y te lo dejamos bien redactado.
        </p>
      )}
      {error && <p className="text-xs text-error-600">{error}</p>}
      {propuesta && (
        <div className="flex flex-col gap-2 rounded-xl border border-borde bg-fondo-sutil p-3.5">
          <p className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Propuesta</p>
          <p className="whitespace-pre-line text-sm text-texto">{propuesta}</p>
          <p className="text-xs text-texto-tenue">Revisala: la IA puede equivocarse.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUsar(propuesta);
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
