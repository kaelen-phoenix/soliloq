"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Pestana = "proyectos" | "talento";

/**
 * Matches en dos pestañas (#304): los de tus Proyectos y Equipos (a quién convocar) y
 * dónde hiciste match vos. Antes iban en una sola lista y se mezclaban.
 */
export function PestanasMatches({
  inicial,
  cantidadProyectos,
  cantidadTalento,
  panelProyectos,
  panelTalento,
}: {
  inicial: Pestana;
  cantidadProyectos: number;
  cantidadTalento: number;
  panelProyectos: React.ReactNode;
  panelTalento: React.ReactNode;
}) {
  const t = useTranslations("proyectos.matches.pestanas");
  const [pestana, setPestana] = useState<Pestana>(inicial);

  const tab = (p: Pestana, etiqueta: string, cantidad: number) => (
    <button
      type="button"
      role="tab"
      id={`pestana-matches-${p}`}
      aria-controls="panel-matches"
      aria-selected={pestana === p}
      onClick={() => setPestana(p)}
      className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
        pestana === p ? "bg-accion font-semibold text-accion-texto" : "text-texto-tenue hover:text-texto"
      }`}
    >
      {etiqueta}
      {cantidad > 0 && ` (${cantidad})`}
    </button>
  );

  return (
    <>
      <div
        role="tablist"
        aria-label={t("etiqueta")}
        className="mb-5 flex gap-1 rounded-full border border-borde bg-fondo-sutil p-1"
      >
        {tab("proyectos", t("misProyectos"), cantidadProyectos)}
        {tab("talento", t("misConvocatorias"), cantidadTalento)}
      </div>
      <div role="tabpanel" id="panel-matches" aria-labelledby={`pestana-matches-${pestana}`}>{pestana === "proyectos" ? panelProyectos : panelTalento}</div>
    </>
  );
}
