"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/convocatorias/avatar";
import { retirarmeDeMatch } from "@/app/(app)/matches/acciones";
import { desvincularmeDeSala } from "@/app/(app)/salas/acciones";

export interface FilaMatchTalento {
  matchId: string;
  esEquipo: boolean;
  obraId: string | null;
  titulo: string;
  fotoUrl: string | null;
  creadorNombre: string | null;
  expiraEn: string;
  estado: "match" | "convocado" | "en_sala";
  salaId: string | null;
}

const CHIP: Record<FilaMatchTalento["estado"], { texto: string; clase: string }> = {
  match: { texto: "Match", clase: "bg-fondo-sutil text-texto-tenue" },
  convocado: { texto: "Te convocaron", clase: "bg-alerta-50 text-alerta-800" },
  en_sala: { texto: "En el chat", clase: "bg-accion text-accion-texto" },
};

const BOTON =
  "rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto transition-colors hover:bg-fondo-sutil";
const BOTON_SALIR =
  "rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50";

/**
 * Matches del lado de quien marcó «Me interesa» (#298): con qué Proyectos y Equipos hizo
 * match, en qué está cada uno, y la salida — retirarse antes de entrar, o salir del chat.
 */
export function MisMatchesTalento({ filas: iniciales }: { filas: FilaMatchTalento[] }) {
  const router = useRouter();
  const [filas, setFilas] = useState(iniciales);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function salir(f: FilaMatchTalento) {
    setOcupado(f.matchId);
    setError(null);
    const res =
      f.estado === "en_sala" && f.salaId
        ? await desvincularmeDeSala(f.salaId)
        : await retirarmeDeMatch(f.matchId);
    setOcupado(null);
    setConfirmando(null);
    if (!res.ok) return setError(res.error);
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    router.refresh();
  }

  return (
    <section>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {filas.map((f) => {
          const titulo = (
            <span className="block truncate text-sm font-medium text-texto">{f.titulo}</span>
          );
          return (
            <li key={f.matchId} className="rounded-xl border border-borde bg-superficie p-3.5">
              <div className="flex items-center gap-3">
                <Avatar url={f.fotoUrl} nombre={f.titulo} size={40} />
                <div className="min-w-0 flex-1">
                  {f.obraId ? (
                    <Link href={`/obras/${f.obraId}`} className="block hover:underline">
                      {titulo}
                    </Link>
                  ) : (
                    titulo
                  )}
                  <span className="block truncate text-xs text-texto-tenue">
                    {f.esEquipo ? "Equipo" : "Proyecto"}
                    {f.creadorNombre ? ` de ${f.creadorNombre}` : ""}
                  </span>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${CHIP[f.estado].clase}`}
                  >
                    {CHIP[f.estado].texto}
                  </span>
                </div>
              </div>

              {confirmando === f.matchId ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-texto-tenue">
                    {f.estado === "en_sala"
                      ? "¿Salir del chat? Dejás tu lugar en el grupo."
                      : "¿Retirarte? Ya no van a poder convocarte para esto."}
                  </span>
                  <button
                    type="button"
                    disabled={ocupado === f.matchId}
                    onClick={() => salir(f)}
                    className={BOTON_SALIR}
                  >
                    {ocupado === f.matchId ? "…" : f.estado === "en_sala" ? "Sí, salir" : "Sí, retirarme"}
                  </button>
                  <button type="button" onClick={() => setConfirmando(null)} className={BOTON}>
                    No
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.estado === "convocado" && (
                    <Link href="/convocatoria" className={BOTON}>
                      Responder
                    </Link>
                  )}
                  {f.estado === "en_sala" && f.salaId && (
                    <Link href={`/salas/${f.salaId}`} className={BOTON}>
                      Ir al chat
                    </Link>
                  )}
                  <button type="button" onClick={() => setConfirmando(f.matchId)} className={BOTON_SALIR}>
                    {f.estado === "en_sala" ? "Salir del chat" : "Retirarme"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
