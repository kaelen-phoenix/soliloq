"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Imagen } from "@/components/ui/imagen";
import {
  convocarMatch,
  descartarConvocado,
  darDeBajaConvocado,
} from "@/app/(app)/matches/acciones";

type Estado = "en_convocados" | "esperando_confirmacion" | "en_sala";

export interface FilaConvocado {
  matchId: string;
  convocatoriaId: string | null;
  talentoId: string;
  nombre: string;
  fotoUrl: string | null;
  esEquipo: boolean;
  iniciativaTitulo: string;
  estado: Estado;
}

const CHIP: Record<Estado, { texto: string; clase: string }> = {
  en_convocados: { texto: "En convocados", clase: "bg-fondo-sutil text-texto-tenue" },
  esperando_confirmacion: { texto: "Esperando confirmación", clase: "bg-alerta-50 text-alerta-800" },
  en_sala: { texto: "En la sala", clase: "bg-accion text-accion-texto" },
};

export function ConvocadosLista({ filas: filasIniciales }: { filas: FilaConvocado[] }) {
  const router = useRouter();
  const [filas, setFilas] = useState(filasIniciales);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (filas.length === 0) return null;

  async function convocar(f: FilaConvocado) {
    setOcupadoId(f.matchId);
    const res = await convocarMatch(f.matchId);
    setOcupadoId(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setFilas((prev) =>
      prev.map((x) => (x.matchId === f.matchId ? { ...x, estado: "esperando_confirmacion" } : x)),
    );
    router.refresh();
  }

  async function descartar(f: FilaConvocado) {
    setOcupadoId(f.matchId);
    const res = await descartarConvocado(f.matchId);
    setOcupadoId(null);
    setConfirmando(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    router.refresh();
  }

  async function baja(f: FilaConvocado) {
    if (!f.convocatoriaId) return;
    setOcupadoId(f.matchId);
    const res = await darDeBajaConvocado(f.convocatoriaId);
    setOcupadoId(null);
    setConfirmando(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
        Convocados ({filas.length})
      </h2>
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {filas.map((f) => (
          <li
            key={f.matchId}
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
              <div className="min-w-0 flex-1">
                <Link
                  href={`/talentos/${f.talentoId}`}
                  className="block truncate text-sm font-medium text-texto hover:underline"
                >
                  {f.nombre}
                </Link>
                <span
                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${CHIP[f.estado].clase}`}
                >
                  {CHIP[f.estado].texto}
                </span>
              </div>

              {f.estado === "en_convocados" && (
                <div className="flex shrink-0 gap-1.5">
                  <Boton
                    variante="secundario"
                    cargando={ocupadoId === f.matchId}
                    textoCargando="…"
                    onClick={() => convocar(f)}
                  >
                    Convocar
                  </Boton>
                  <button
                    type="button"
                    onClick={() => setConfirmando(f.matchId)}
                    className="rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
                  >
                    Descartar
                  </button>
                </div>
              )}
              {f.estado === "en_sala" && (
                <button
                  type="button"
                  onClick={() => setConfirmando(f.matchId)}
                  className="shrink-0 rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
                >
                  Dar de baja
                </button>
              )}
            </div>

            {confirmando === f.matchId && (
              <div className="flex flex-col gap-2 border-t border-borde px-3.5 py-3">
                <p className="text-sm text-texto">
                  {f.estado === "en_sala"
                    ? `¿Dar de baja a ${f.nombre}? Sale de la sala y se libera un lugar.`
                    : `¿Descartar a ${f.nombre} de Convocados? Se libera el lugar.`}
                </p>
                <div className="flex gap-2">
                  <Boton
                    variante="peligro"
                    className="border border-error-600"
                    cargando={ocupadoId === f.matchId}
                    textoCargando="…"
                    onClick={() => (f.estado === "en_sala" ? baja(f) : descartar(f))}
                  >
                    {f.estado === "en_sala" ? "Dar de baja" : "Descartar"}
                  </Boton>
                  <Boton
                    variante="secundario"
                    disabled={ocupadoId === f.matchId}
                    onClick={() => setConfirmando(null)}
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
