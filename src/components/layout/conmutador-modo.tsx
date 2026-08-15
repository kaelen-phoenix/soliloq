"use client";

import Link from "next/link";
import { useTransition } from "react";
import { conmutarModo } from "@/app/acciones-modo";
import { Icono } from "@/components/ui/icono";
import type { RolUsuario } from "@/lib/supabase/types";

const ETIQUETA: Record<RolUsuario, string> = {
  talento: "Talento",
  creador: "Creador",
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
      <div className="flex items-center gap-2.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-ink-400">
          {ETIQUETA[modoActivo]}
        </span>
        {rolFaltante && (
          <>
            <span className="text-ink-200">·</span>
            <Link
              href="/perfil/nuevo"
              className="text-2xs font-medium text-ink-600 underline decoration-ink-300 underline-offset-2 hover:text-ink-900"
            >
              Sumar perfil de {ETIQUETA[rolFaltante]}
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciarTransicion(() => conmutarModo(otro))}
      className="group inline-flex items-center gap-1.5 rounded-lg border border-ink-200 py-1 pl-2.5 pr-2 text-2xs font-medium text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
      title={`Cambiar a modo ${ETIQUETA[otro]}`}
    >
      <span className="uppercase tracking-wide">{ETIQUETA[modoActivo]}</span>
      <Icono nombre="cambiar" className="h-3.5 w-3.5 text-ink-400 group-hover:text-ink-600" />
    </button>
  );
}
