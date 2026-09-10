"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { responderConvocatoria } from "@/app/(app)/convocatoria/acciones";

export interface FilaConvocatoria {
  convocatoriaId: string;
  esEquipo: boolean;
  iniciativaTitulo: string;
  creadorNombre: string;
  talentoFotoUrl: string | null;
  iniciativaFotoUrl: string | null;
}

export function ConvocatoriasLista({ filas: filasIniciales }: { filas: FilaConvocatoria[] }) {
  const router = useRouter();
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
    if (aceptar) router.push("/salas");
    else router.refresh();
  }

  return (
    <>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="flex flex-col gap-4">
        {filas.map((f) => (
          <li
            key={f.convocatoriaId}
            className="rounded-2xl border border-borde bg-superficie p-5 text-center"
          >
            <p className="text-2xs font-semibold uppercase tracking-wide text-coral-700">
              {f.esEquipo ? "Hay equipo" : "Hay proyecto"}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {f.talentoFotoUrl ? (
                <Imagen
                  src={f.talentoFotoUrl}
                  alt=""
                  width={64}
                  height={64}
                  contenedorClassName="h-16 w-16 rounded-full"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
                  ·
                </span>
              )}
              <Icono nombre="corazon" relleno className="h-5 w-5 text-coral" />
              {f.iniciativaFotoUrl ? (
                <Imagen
                  src={f.iniciativaFotoUrl}
                  alt={f.iniciativaTitulo}
                  width={64}
                  height={64}
                  contenedorClassName="h-16 w-16 rounded-xl"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-100 p-1 text-2xs font-medium text-texto-tenue">
                  {f.iniciativaTitulo}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-texto">
              {f.creadorNombre} te convoca a <span className="font-medium">{f.iniciativaTitulo}</span>
            </p>
            <button
              type="button"
              disabled={ocupadoId === f.convocatoriaId}
              onClick={() => responder(f, true)}
              className="mt-4 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto disabled:opacity-50"
            >
              {ocupadoId === f.convocatoriaId ? "…" : "Aceptar"}
            </button>
            <button
              type="button"
              disabled={ocupadoId === f.convocatoriaId}
              onClick={() => responder(f, false)}
              className="mt-2 w-full py-1.5 text-xs font-medium text-texto-tenue hover:text-texto disabled:opacity-50"
            >
              Ahora no puedo
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
