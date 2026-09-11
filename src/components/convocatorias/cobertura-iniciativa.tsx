"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Imagen } from "@/components/ui/imagen";
import { PlacaPerfilTalento } from "@/components/perfil/placa-perfil-talento";
import { darDeBajaConvocado } from "@/app/(app)/matches/acciones";

export interface FilaCobertura {
  rolId: string | null;
  rolNombre: string | null;
  vacantes: number;
  convocatoriaId: string | null;
  talentoId: string | null;
  talentoNombre: string | null;
  talentoFotoUrl: string | null;
}

interface Grupo {
  rolId: string | null;
  rolNombre: string | null;
  vacantes: number;
  ocupantes: { convocatoriaId: string; talentoId: string; nombre: string; fotoUrl: string | null }[];
}

function agrupar(filas: FilaCobertura[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const f of filas) {
    const clave = f.rolId ?? "__equipo__";
    if (!grupos.has(clave)) {
      grupos.set(clave, { rolId: f.rolId, rolNombre: f.rolNombre, vacantes: f.vacantes, ocupantes: [] });
    }
    if (f.talentoId && f.convocatoriaId) {
      grupos.get(clave)!.ocupantes.push({
        convocatoriaId: f.convocatoriaId,
        talentoId: f.talentoId,
        nombre: f.talentoNombre ?? "Talento",
        fotoUrl: f.talentoFotoUrl,
      });
    }
  }
  return [...grupos.values()];
}

function Avatar({ url, nombre }: { url: string | null; nombre: string }) {
  return url ? (
    <Imagen src={url} alt={nombre} width={32} height={32} contenedorClassName="h-8 w-8 shrink-0 rounded-full" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-texto-tenue">
      {nombre[0]}
    </span>
  );
}

/**
 * Cobertura de roles (Proyecto) o participantes (Equipo) — issue #152. Sólo lectura +
 * "Quitar": tocar a alguien abre su perfil sin salir de la pantalla; "Quitar" reutiliza
 * `dar_de_baja_convocado`, la misma acción de Convocados.
 */
export function CoberturaIniciativa({ filas, esEquipo }: { filas: FilaCobertura[]; esEquipo: boolean }) {
  const router = useRouter();
  const grupos = useMemo(() => agrupar(filas), [filas]);
  const [perfilAbierto, setPerfilAbierto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quitar(convocatoriaId: string) {
    setOcupado(true);
    const res = await darDeBajaConvocado(convocatoriaId);
    setOcupado(false);
    setConfirmando(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  if (grupos.length === 0) return null;

  const totalOcupados = grupos.reduce((acc, g) => acc + g.ocupantes.length, 0);
  const totalLugares = grupos.reduce((acc, g) => acc + g.vacantes, 0);

  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
        {esEquipo ? `Participantes — ${totalOcupados} de ${totalLugares}` : `Roles — ${totalOcupados} de ${totalLugares} cubiertos`}
      </h3>

      {error && <p className="text-xs text-error-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {grupos.map((g) => {
          const disponibles = g.vacantes - g.ocupantes.length;
          // Un rol de a una vacante se lee mejor en una sola línea: "Actriz — Disponible".
          if (!esEquipo && g.vacantes === 1) {
            const unico = g.ocupantes[0] ?? null;
            return (
              <li
                key={g.rolId}
                className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3.5"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-texto">{g.rolNombre}</p>
                {unico ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPerfilAbierto(unico.talentoId)}
                      className="flex shrink-0 items-center gap-2 hover:underline"
                    >
                      <Avatar url={unico.fotoUrl} nombre={unico.nombre} />
                      <span className="text-sm text-texto">{unico.nombre}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(unico.convocatoriaId)}
                      className="shrink-0 rounded-lg border border-error-400 px-2 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
                    >
                      Quitar
                    </button>
                  </>
                ) : (
                  <span className="shrink-0 text-sm text-texto-tenue">Disponible</span>
                )}
              </li>
            );
          }

          return (
            <li key={g.rolId ?? "equipo"} className="rounded-xl border border-borde bg-superficie p-3.5">
              {!esEquipo && (
                <p className="mb-2 text-sm font-medium text-texto">
                  {g.rolNombre} — {g.ocupantes.length}/{g.vacantes} cubierto
                  {g.ocupantes.length === 1 ? "" : "s"}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {g.ocupantes.map((o) => (
                  <li key={o.convocatoriaId} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPerfilAbierto(o.talentoId)}
                      className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                    >
                      <Avatar url={o.fotoUrl} nombre={o.nombre} />
                      <span className="truncate text-sm text-texto">{o.nombre}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(o.convocatoriaId)}
                      className="shrink-0 rounded-lg border border-error-400 px-2 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
                {disponibles > 0 && (
                  <li className="text-sm text-texto-tenue">
                    {disponibles} {esEquipo ? "lugar" : "vacante"}
                    {disponibles === 1 ? "" : "s"} disponible{disponibles === 1 ? "" : "s"}
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
            <p className="text-sm text-texto">
              ¿Quitar a esta persona {esEquipo ? "del equipo" : "del rol"}? Sale de la sala y el
              lugar vuelve a quedar disponible.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => quitar(confirmando)}
                className="flex-1 rounded-xl border border-error-600 bg-superficie px-4 py-2.5 text-sm font-medium text-error-600 disabled:opacity-50"
              >
                {ocupado ? "…" : "Quitar"}
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setConfirmando(null)}
                className="flex-1 rounded-xl border border-borde px-4 py-2.5 text-sm font-medium text-texto disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {perfilAbierto && (
        <PlacaPerfilTalento talentoId={perfilAbierto} onCerrar={() => setPerfilAbierto(null)} />
      )}
    </section>
  );
}
