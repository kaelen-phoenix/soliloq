"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Boton } from "@/components/ui/boton";
import {
  destacarChat,
  quitarDestacadoChat,
  desvincularmeDeSala,
} from "@/app/(app)/salas/acciones";
import { BadgeNoLeidos, useNoLeidos } from "./no-leidos";

export interface SalaItem {
  salaId: string;
  titulo: string;
  esEquipo: boolean;
  ultimoMensaje: string | null;
  ultimaActividad: string | null;
  destacadoEn: string | null;
  esDueno: boolean;
}

// Destacados primero (último destacado arriba), después el resto por actividad reciente.
function ordenar(salas: SalaItem[]) {
  return [...salas].sort((a, b) => {
    if (a.destacadoEn && b.destacadoEn) return b.destacadoEn.localeCompare(a.destacadoEn);
    if (a.destacadoEn) return -1;
    if (b.destacadoEn) return 1;
    return (b.ultimaActividad ?? "").localeCompare(a.ultimaActividad ?? "");
  });
}

export function ListaSalas({ salas: salasIniciales }: { salas: SalaItem[] }) {
  const [salas, setSalas] = useState(salasIniciales);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { porSala: noLeidos, revision } = useNoLeidos();
  const router = useRouter();

  // #216: cuando llega un mensaje la sala se enciende en vivo, pero la vista previa del
  // último mensaje y el orden por actividad vienen del servidor — se piden de nuevo con
  // cada mensaje (`revision`), cambie o no el total de no leídos.
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    router.refresh();
  }, [revision, router]);
  useEffect(() => setSalas(salasIniciales), [salasIniciales]);

  // El menú de "..." se quedaba abierto para siempre salvo que se tocara una opción de
  // adentro: tocar afuera, o `Esc`, ahora lo cierran — como cualquier menú desplegable.
  useEffect(() => {
    if (!menuAbierto) return;
    function cerrar(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setMenuAbierto(null);
        return;
      }
      const objetivo = e.target as Element;
      if (!objetivo.closest(`[data-sala-menu="${menuAbierto}"]`)) setMenuAbierto(null);
    }
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [menuAbierto]);

  async function alternarDestacado(s: SalaItem) {
    setOcupado(true);
    const res = s.destacadoEn
      ? await quitarDestacadoChat(s.salaId)
      : await destacarChat(s.salaId);
    setOcupado(false);
    setMenuAbierto(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    const destacadoEn = s.destacadoEn ? null : new Date().toISOString();
    setSalas((prev) =>
      ordenar(prev.map((x) => (x.salaId === s.salaId ? { ...x, destacadoEn } : x))),
    );
  }

  async function desvincular(s: SalaItem) {
    setOcupado(true);
    const res = await desvincularmeDeSala(s.salaId);
    setOcupado(false);
    setConfirmando(null);
    setMenuAbierto(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setSalas((prev) => prev.filter((x) => x.salaId !== s.salaId));
  }

  return (
    <>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {salas.map((s) => {
          const sinLeer = noLeidos.get(s.salaId) ?? 0;
          return (
          <li
            key={s.salaId}
            data-sin-leer={sinLeer > 0 || undefined}
            className={`relative flex flex-col rounded-xl border bg-superficie transition-colors ${
              // #216: una sala con mensajes nuevos se "enciende" — gana sobre el borde de
              // destacado (la estrella sigue diciendo que está destacada).
              sinLeer > 0
                ? "border-brand-500 bg-brand-500/[0.06] shadow-[0_0_18px_-6px] shadow-brand-500/60"
                : s.destacadoEn
                  ? "border-coral"
                  : "border-borde"
            }`}
          >
            <div className="flex items-center gap-2 p-4">
              <Link href={`/salas/${s.salaId}`} className="flex min-w-0 flex-1 items-center gap-2">
                {s.destacadoEn && (
                  <Icono nombre="estrella" relleno className="h-4 w-4 shrink-0 text-coral-700" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                        s.esEquipo ? "bg-coral text-ink-950" : "bg-brand-600 text-white"
                      }`}
                    >
                      {s.esEquipo ? "Equipo" : "Proyecto"}
                    </span>
                    <p
                      className={`truncate text-base text-texto ${sinLeer > 0 ? "font-semibold" : "font-medium"}`}
                    >
                      {s.titulo}
                    </p>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-sm ${sinLeer > 0 ? "font-medium text-texto" : "text-texto-tenue"}`}
                  >
                    {s.ultimoMensaje ?? "Sala recién creada"}
                  </p>
                </div>
                {sinLeer > 0 && (
                  <>
                    <span className="sr-only">{`, ${sinLeer} sin leer`}</span>
                    <BadgeNoLeidos cantidad={sinLeer} className="shrink-0 ring-0" />
                  </>
                )}
              </Link>
              <button
                type="button"
                aria-label="Opciones del chat"
                aria-expanded={menuAbierto === s.salaId}
                data-sala-menu={s.salaId}
                onClick={() => setMenuAbierto((m) => (m === s.salaId ? null : s.salaId))}
                className="shrink-0 rounded-lg p-1.5 text-texto-tenue transition-colors hover:bg-fondo-sutil"
              >
                <Icono nombre="puntos" className="h-4 w-4" />
              </button>

              {menuAbierto === s.salaId && (
                <div
                  data-sala-menu={s.salaId}
                  className="absolute right-3 top-12 z-10 w-52 rounded-xl border border-borde bg-superficie py-1 shadow-tarjeta"
                >
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => alternarDestacado(s)}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
                  >
                    <Icono nombre="estrella" relleno={!!s.destacadoEn} className="h-4 w-4" />
                    {s.destacadoEn ? "Quitar destacado" : "Destacar"}
                  </button>
                  {!s.esDueno && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        setMenuAbierto(null);
                        setConfirmando(s.salaId);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50"
                    >
                      <Icono nombre="cruz" className="h-4 w-4" />
                      Desvincularme
                    </button>
                  )}
                </div>
              )}
            </div>

            {confirmando === s.salaId && (
              <div className="flex flex-col gap-2 border-t border-borde px-4 py-3">
                <p className="text-sm text-texto">
                  ¿Seguro que querés desvincularte de «{s.titulo}»? Vas a perder el acceso a
                  este chat.
                </p>
                <div className="flex gap-2">
                  <Boton
                    variante="peligro"
                    className="border border-error-600"
                    cargando={ocupado}
                    textoCargando="Saliendo…"
                    onClick={() => desvincular(s)}
                  >
                    Aceptar
                  </Boton>
                  <Boton
                    variante="secundario"
                    disabled={ocupado}
                    onClick={() => setConfirmando(null)}
                  >
                    Rechazar
                  </Boton>
                </div>
              </div>
            )}
          </li>
          );
        })}
      </ul>
    </>
  );
}
