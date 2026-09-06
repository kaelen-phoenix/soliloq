"use client";

import Link from "next/link";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Imagen } from "@/components/ui/imagen";
import { darDeBajaConvocado } from "@/app/(app)/matches/acciones";

export interface FilaConvocado {
  convocatoriaId: string;
  talentoId: string;
  nombre: string;
  fotoUrl: string | null;
}

export function ConvocadosLista({ filas: filasIniciales }: { filas: FilaConvocado[] }) {
  const [filas, setFilas] = useState(filasIniciales);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function baja(f: FilaConvocado) {
    setOcupadoId(f.convocatoriaId);
    const res = await darDeBajaConvocado(f.convocatoriaId);
    setOcupadoId(null);
    setConfirmandoId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setFilas((prev) => prev.filter((x) => x.convocatoriaId !== f.convocatoriaId));
  }

  if (filas.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
        Convocados ({filas.length})
      </h2>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {filas.map((f) => (
          <li
            key={f.convocatoriaId}
            className="flex flex-col rounded-xl border border-borde bg-superficie"
          >
            <div className="flex items-center gap-3 p-3.5">
              <Link href={`/talentos/${f.talentoId}`} className="shrink-0">
                {f.fotoUrl ? (
                  <Imagen
                    src={f.fotoUrl}
                    alt={f.nombre}
                    width={40}
                    height={40}
                    contenedorClassName="h-10 w-10 rounded-full"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue">
                    {f.nombre[0]}
                  </span>
                )}
              </Link>
              <Link
                href={`/talentos/${f.talentoId}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-texto hover:underline"
              >
                {f.nombre}
              </Link>
              <button
                type="button"
                onClick={() => setConfirmandoId(f.convocatoriaId)}
                className="shrink-0 rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
              >
                Dar de baja
              </button>
            </div>
            {confirmandoId === f.convocatoriaId && (
              <div className="flex flex-col gap-2 border-t border-borde px-3.5 py-3">
                <p className="text-sm text-texto">
                  ¿Dar de baja a {f.nombre}? Sale de la sala y se libera un lugar.
                </p>
                <div className="flex gap-2">
                  <Boton
                    variante="peligro"
                    className="border border-error-600"
                    cargando={ocupadoId === f.convocatoriaId}
                    textoCargando="…"
                    onClick={() => baja(f)}
                  >
                    Dar de baja
                  </Boton>
                  <Boton
                    variante="secundario"
                    disabled={ocupadoId === f.convocatoriaId}
                    onClick={() => setConfirmandoId(null)}
                  >
                    Cancelar
                  </Boton>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
