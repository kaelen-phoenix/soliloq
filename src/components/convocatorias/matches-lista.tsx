"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { aceptarMatch } from "@/app/(app)/matches/acciones";

export interface FilaMatch {
  matchId: string;
  talentoId: string;
  nombre: string;
  fotoUrl: string | null;
  expiraEn: string;
  esEquipo: boolean;
  iniciativaTitulo: string;
  iniciativaFotoUrl: string | null;
  cupoLleno: boolean;
}

function diasRestantes(expiraEn: string) {
  const dias = Math.ceil((new Date(expiraEn).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

function Avatar({ url, nombre, size }: { url: string | null; nombre: string; size: number }) {
  return url ? (
    <Imagen
      src={url}
      alt={nombre}
      width={size}
      height={size}
      contenedorClassName="shrink-0 rounded-full"
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue"
      style={{ width: size, height: size }}
    >
      {nombre[0]}
    </span>
  );
}

export function MatchesLista({ filas: filasIniciales }: { filas: FilaMatch[] }) {
  const router = useRouter();
  const [filas, setFilas] = useState(filasIniciales);
  const [confirmar, setConfirmar] = useState<FilaMatch | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aceptar(f: FilaMatch) {
    setOcupado(true);
    const res = await aceptarMatch(f.matchId);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setConfirmar(null);
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    router.refresh(); // aparece en Convocados
  }

  return (
    <>
      {error && !confirmar && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {filas.map((f) => (
          <li
            key={f.matchId}
            className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3.5"
          >
            <Link href={`/talentos/${f.talentoId}`} className="shrink-0">
              <Avatar url={f.fotoUrl} nombre={f.nombre} size={48} />
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
            <button
              type="button"
              disabled={f.cupoLleno}
              onClick={() => {
                setError(null);
                setConfirmar(f);
              }}
              className="shrink-0 rounded-lg bg-accion px-3 py-1.5 text-xs font-semibold text-accion-texto disabled:opacity-40"
            >
              {f.cupoLleno ? "Cupo lleno" : "Aceptar"}
            </button>
          </li>
        ))}
      </ul>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
            <p className="text-2xs font-semibold uppercase tracking-wide text-coral-700">Match</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Avatar url={confirmar.fotoUrl} nombre={confirmar.nombre} size={64} />
              <Icono nombre="corazon" relleno className="h-5 w-5 text-coral" />
              {confirmar.iniciativaFotoUrl ? (
                <Imagen
                  src={confirmar.iniciativaFotoUrl}
                  alt={confirmar.iniciativaTitulo}
                  width={64}
                  height={64}
                  contenedorClassName="h-16 w-16 rounded-xl"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-100 p-1 text-2xs font-medium text-texto-tenue">
                  {confirmar.iniciativaTitulo}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-texto">
              {confirmar.esEquipo
                ? "¿Querés que forme parte de tu equipo?"
                : "¿Querés que forme parte de tu proyecto?"}
            </p>
            {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aceptar(confirmar)}
              className="mt-4 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto disabled:opacity-50"
            >
              {ocupado ? "…" : "Aceptar"}
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => setConfirmar(null)}
              className="mt-2 w-full py-1.5 text-xs font-medium text-texto-tenue hover:text-texto disabled:opacity-50"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}
    </>
  );
}
