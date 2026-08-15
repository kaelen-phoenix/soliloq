"use client";

import { forwardRef } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  /** Texto mientras carga, cuando "Guardando…" no describe la acción. */
  textoCargando?: string;
}

const estilosPorVariante: Record<Variante, string> = {
  primario: "bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-300",
  secundario: "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 disabled:opacity-50",
  fantasma: "text-ink-600 hover:bg-ink-50 disabled:opacity-50",
  peligro: "text-error-600 hover:bg-error-50 disabled:opacity-50",
};

export const Boton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variante = "primario",
      cargando,
      textoCargando = "Guardando…",
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${estilosPorVariante[variante]} ${className}`}
      {...props}
    >
      {cargando ? textoCargando : children}
    </button>
  )
);

Boton.displayName = "Boton";
