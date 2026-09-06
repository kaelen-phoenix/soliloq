"use client";

import Link from "next/link";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Imagen } from "@/components/ui/imagen";
import { convocarMatch } from "@/app/(app)/matches/acciones";

export interface FilaMatch {
  matchId: string;
  talentoId: string;
  nombre: string;
  fotoUrl: string | null;
  expiraEn: string;
  convocado: boolean;
  cupoLleno: boolean;
}

function diasRestantes(expiraEn: string) {
  const ms = new Date(expiraEn).getTime() - Date.now();
  const dias = Math.ceil(ms / 86_400_000);
  if (dias <= 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

export function MatchesLista({ filas: filasIniciales }: { filas: FilaMatch[] }) {
  const [filas, setFilas] = useState(filasIniciales);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function convocar(f: FilaMatch) {
    setOcupadoId(f.matchId);
    const res = await convocarMatch(f.matchId);
    setOcupadoId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setFilas((prev) =>
      prev.map((x) => (x.matchId === f.matchId ? { ...x, convocado: true } : x)),
    );
  }

  return (
    <>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {filas.map((f) => (
          <li
            key={f.matchId}
            className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3.5"
          >
            <Link href={`/talentos/${f.talentoId}`} className="shrink-0">
              {f.fotoUrl ? (
                <Imagen
                  src={f.fotoUrl}
                  alt={f.nombre}
                  width={48}
                  height={48}
                  contenedorClassName="h-12 w-12 rounded-full"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue">
                  {f.nombre[0]}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/talentos/${f.talentoId}`}
                className="block truncate text-base font-medium text-texto hover:underline"
              >
                {f.nombre}
              </Link>
              <p className="mt-0.5 text-xs text-texto-tenue">{diasRestantes(f.expiraEn)}</p>
            </div>
            {f.convocado ? (
              <span className="shrink-0 rounded-lg bg-accion px-3 py-1.5 text-xs font-semibold text-accion-texto">
                Convocada
              </span>
            ) : (
              <Boton
                variante="secundario"
                className="shrink-0"
                disabled={f.cupoLleno}
                cargando={ocupadoId === f.matchId}
                textoCargando="…"
                onClick={() => convocar(f)}
              >
                {f.cupoLleno ? "Cupo lleno" : "Convocar"}
              </Boton>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
