"use client";

import { Icono } from "./icono";

/**
 * Toggle 👁️ de visibilidad (issue #110). Ojo abierto = visible; ojo cerrado = oculto.
 * El texto describe el estado actual, no la acción.
 */
export function ToggleVisibilidad({
  visible,
  onCambio,
  textoVisible,
  textoOculto,
}: {
  visible: boolean;
  onCambio: (v: boolean) => void;
  textoVisible: string;
  textoOculto: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      onClick={() => onCambio(!visible)}
      className="inline-flex items-center gap-2 self-start rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-tenue transition-colors hover:bg-fondo-sutil"
    >
      <Icono nombre={visible ? "ojo" : "ojo-cerrado"} className="h-4 w-4 shrink-0" />
      {visible ? textoVisible : textoOculto}
    </button>
  );
}
