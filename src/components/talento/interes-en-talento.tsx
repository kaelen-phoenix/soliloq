"use client";

import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { marcarInteresEnTalento } from "@/app/(app)/matches/acciones";

/**
 * Acciones del Creador sobre la ficha de un talento (issue #105): «Me interesa» / «No me
 * interesa», dirigidas a su iniciativa activa. El match a ciegas: acá no se muestra si la
 * otra persona ya marcó.
 */
export function InteresEnTalento({
  talentoId,
  tituloIniciativa,
  interesInicial,
}: {
  talentoId: string;
  /** Nombre del proyecto/equipo activo, o `null` si no tiene ninguno. */
  tituloIniciativa: string | null;
  /** `true` me interesa, `false` la descarté, `null` no la marqué. */
  interesInicial: boolean | null;
}) {
  const [interes, setInteres] = useState<boolean | null>(interesInicial);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tituloIniciativa) {
    return (
      <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
        Creá un proyecto o equipo para marcar interés en artistas.
      </p>
    );
  }

  async function marcar(valor: boolean) {
    setOcupado(true);
    setError(null);
    const previo = interes;
    setInteres(valor);
    const res = await marcarInteresEnTalento(talentoId, valor);
    setOcupado(false);
    if (!res.ok) {
      setInteres(previo);
      setError(res.error);
    }
  }

  const btn = "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
        Para «{tituloIniciativa}»
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => marcar(false)}
          className={`${btn} ${
            interes === false
              ? "border-borde bg-fondo-sutil text-texto"
              : "border-borde text-texto-tenue hover:bg-fondo-sutil"
          }`}
        >
          <Icono nombre="cruz" className="h-4 w-4" />
          No me interesa
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => marcar(true)}
          className={`${btn} ${
            interes === true
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-brand-400 text-brand-600 hover:bg-brand-50"
          }`}
        >
          <Icono nombre="corazon" relleno={interes === true} className="h-4 w-4" />
          {interes === true ? "Te interesa" : "Me interesa"}
        </button>
      </div>
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}
