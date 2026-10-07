"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/convocatorias/avatar";
import { retirarmeDeMatch } from "@/app/(sitio)/(app)/matches/acciones";
import { desvincularmeDeSala } from "@/app/(sitio)/(app)/salas/acciones";

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

// El texto de cada chip sale de `proyectos.misMatches.estado.<estado>`.
const CHIP: Record<FilaMatchTalento["estado"], { clase: string }> = {
  match: { clase: "bg-fondo-sutil text-texto-tenue" },
  convocado: { clase: "bg-alerta-50 text-alerta-800" },
  en_sala: { clase: "bg-accion text-accion-texto" },
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
  const t = useTranslations("proyectos.misMatches");
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
                    {f.creadorNombre
                      ? t(f.esEquipo ? "equipoDe" : "proyectoDe", { nombre: f.creadorNombre })
                      : t(f.esEquipo ? "equipo" : "proyecto")}
                  </span>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${CHIP[f.estado].clase}`}
                  >
                    {t(`estado.${f.estado}`)}
                  </span>
                </div>
              </div>

              {confirmando === f.matchId ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-texto-tenue">
                    {f.estado === "en_sala"
                      ? t("confirmarSalir")
                      : t("confirmarRetirarte")}
                  </span>
                  <button
                    type="button"
                    disabled={ocupado === f.matchId}
                    onClick={() => salir(f)}
                    className={BOTON_SALIR}
                  >
                    {ocupado === f.matchId ? "…" : f.estado === "en_sala" ? t("siSalir") : t("siRetirarme")}
                  </button>
                  <button type="button" onClick={() => setConfirmando(null)} className={BOTON}>
                    {t("no")}
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.estado === "convocado" && (
                    <Link href="/convocatoria" className={BOTON}>
                      {t("responder")}
                    </Link>
                  )}
                  {f.estado === "en_sala" && f.salaId && (
                    <Link href={`/salas/${f.salaId}`} className={BOTON}>
                      {t("irAlChat")}
                    </Link>
                  )}
                  <button type="button" onClick={() => setConfirmando(f.matchId)} className={BOTON_SALIR}>
                    {f.estado === "en_sala" ? t("salirDelChat") : t("retirarme")}
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
