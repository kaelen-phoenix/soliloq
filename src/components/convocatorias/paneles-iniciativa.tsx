"use client";

import { useState } from "react";

type Modo = "proyecto" | "equipo";

/**
 * Selector tipo toggle del tablero del Creador (issue #101): elige entre armar un
 * **proyecto** (obra con roles) o un **equipo** (por cupo, sin roles), y muestra el panel
 * de uno u otro. La exclusión mutua real la garantiza un trigger de base
 * (`trg_iniciativa_unica_*`); acá el toggle solo decide qué se ve. Arranca en el que ya
 * esté activo.
 *
 * Los colores del toggle son los mismos que los distintivos en el feed: rojo `brand` para
 * proyecto, `coral` para equipo.
 */
export function PanelesIniciativa({
  modoInicial,
  panelProyecto,
  panelEquipo,
}: {
  modoInicial: Modo;
  panelProyecto: React.ReactNode;
  panelEquipo: React.ReactNode;
}) {
  const [modo, setModo] = useState<Modo>(modoInicial);

  const tab = (m: Modo, etiqueta: string, activo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => setModo(m)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        modo === m ? activo : "text-texto-tenue hover:text-texto"
      }`}
    >
      {etiqueta}
    </button>
  );

  return (
    <>
      <div
        role="tablist"
        aria-label="Tipo de iniciativa"
        className="mb-5 flex gap-1 rounded-xl border border-borde bg-fondo-sutil p-1"
      >
        {tab("proyecto", "Armar proyecto", "bg-brand-600 text-white")}
        {tab("equipo", "Armar equipo", "bg-coral text-ink-950")}
      </div>
      <div role="tabpanel">{modo === "proyecto" ? panelProyecto : panelEquipo}</div>
    </>
  );
}
