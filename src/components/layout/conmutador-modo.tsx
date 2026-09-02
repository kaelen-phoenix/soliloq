"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useTransition } from "react";
import { conmutarModo } from "@/app/acciones-modo";
import { Icono } from "@/components/ui/icono";
import type { RolUsuario } from "@/lib/supabase/types";

export function ConmutadorModo({
  modoActivo,
  tieneAmbosPerfiles,
  rolFaltante,
}: {
  modoActivo: RolUsuario;
  tieneAmbosPerfiles: boolean;
  rolFaltante: RolUsuario | null;
}) {
  const t = useTranslations("modo");
  const [pendiente, iniciarTransicion] = useTransition();
  const otro: RolUsuario = modoActivo === "talento" ? "creador" : "talento";

  // Con un solo perfil no hay nada que conmutar: se ofrece crear el que falta.
  if (!tieneAmbosPerfiles) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t(modoActivo)}
        </span>
        {rolFaltante && (
          <>
            <span className="text-ink-200">·</span>
            <Link
              href="/perfil/nuevo"
              className="text-2xs font-medium text-texto-tenue underline decoration-ink-300 underline-offset-2 hover:text-texto"
            >
              {t("sumarPerfil", { rol: t(rolFaltante) })}
            </Link>
          </>
        )}
      </div>
    );
  }

  // Estado y acción, separados. Antes un solo botón mostraba el modo **actual**
  // ("TALENTO") con un ícono de intercambio: parecía que llevaba *a* Talento cuando en
  // realidad estabas en Talento y te pasaba a Creador. Ahora la píldora dice dónde estás
  // y el botón dice a dónde vas —nunca el estado actual.
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center rounded-md acento-fondo px-2 py-0.5 text-2xs font-medium acento-texto">
        {t("estasEn", { rol: t(modoActivo) })}
      </span>
      <button
        type="button"
        disabled={pendiente}
        onClick={() => iniciarTransicion(() => conmutarModo(otro))}
        aria-label={t("cambiarA", { rol: t(otro) })}
        className="group inline-flex items-center gap-1 rounded-lg border border-borde py-1 pl-2 pr-1.5 text-2xs font-medium text-texto-tenue transition-colors hover:border-ink-300 hover:bg-fondo-sutil disabled:opacity-50"
      >
        <span>{t("cambiarA", { rol: t(otro) })}</span>
        <Icono nombre="cambiar" className="h-3.5 w-3.5 text-texto-tenue group-hover:text-texto-tenue" />
      </button>
    </div>
  );
}
