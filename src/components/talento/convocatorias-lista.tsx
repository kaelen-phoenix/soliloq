"use client";

import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { responderConvocatoria } from "@/app/(app)/convocado/acciones";

export interface FilaConvocatoria {
  convocatoriaId: string;
  titulo: string;
  creadorNombre: string;
  esEquipo: boolean;
}

export function ConvocatoriasLista({ filas: filasIniciales }: { filas: FilaConvocatoria[] }) {
  const [filas, setFilas] = useState(filasIniciales);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function responder(f: FilaConvocatoria, aceptar: boolean) {
    setOcupadoId(f.convocatoriaId);
    const res = await responderConvocatoria(f.convocatoriaId, aceptar);
    setOcupadoId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setFilas((prev) => prev.filter((x) => x.convocatoriaId !== f.convocatoriaId));
  }

  return (
    <>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.convocatoriaId} className="rounded-2xl border border-borde bg-superficie p-4">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                f.esEquipo ? "bg-coral text-ink-950" : "bg-brand-600 text-white"
              }`}
            >
              {f.esEquipo ? "Armar equipo" : "Proyecto"}
            </span>
            <p className="mt-2 text-base font-medium text-texto">{f.titulo}</p>
            <p className="mt-0.5 text-sm text-texto-tenue">Te convocó {f.creadorNombre}</p>
            <div className="mt-3 flex gap-2">
              <Boton
                className="flex-1"
                cargando={ocupadoId === f.convocatoriaId}
                textoCargando="…"
                onClick={() => responder(f, true)}
              >
                Aceptar
              </Boton>
              <Boton
                variante="secundario"
                className="flex-1"
                disabled={ocupadoId === f.convocatoriaId}
                onClick={() => responder(f, false)}
              >
                Rechazar
              </Boton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
