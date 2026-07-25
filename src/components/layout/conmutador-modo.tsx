"use client";

import Link from "next/link";
import { useTransition } from "react";
import { conmutarModo } from "@/app/acciones-modo";
import type { RolUsuario } from "@/lib/supabase/types";

const ETIQUETA: Record<RolUsuario, string> = {
  talento: "Talento",
  creador: "Creador",
};

const ICONO: Record<RolUsuario, string> = {
  talento: "🎭",
  creador: "🎬",
};

export function ConmutadorModo({
  modoActivo,
  tieneAmbosPerfiles,
  rolFaltante,
}: {
  modoActivo: RolUsuario;
  tieneAmbosPerfiles: boolean;
  rolFaltante: RolUsuario | null;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const otro: RolUsuario = modoActivo === "talento" ? "creador" : "talento";

  // Con un solo perfil no hay nada que conmutar: se ofrece crear el que falta.
  if (!tieneAmbosPerfiles) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
          {ICONO[modoActivo]} {ETIQUETA[modoActivo]}
        </span>
        {rolFaltante && (
          <Link href="/perfil/nuevo" className="text-xs font-medium text-brand-600 underline">
            Sumar perfil de {ETIQUETA[rolFaltante]}
          </Link>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciarTransicion(() => conmutarModo(otro))}
      className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-200 disabled:opacity-60"
      title={`Cambiar a modo ${ETIQUETA[otro]}`}
    >
      <span>
        {ICONO[modoActivo]} {ETIQUETA[modoActivo]}
      </span>
      <span className="text-ink-300">⇄</span>
      <span className="text-ink-500">{ETIQUETA[otro]}</span>
    </button>
  );
}
