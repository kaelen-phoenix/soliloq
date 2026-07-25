"use client";

import { forwardRef } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

const estilosPorVariante: Record<Variante, string> = {
  primario: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300",
  secundario: "bg-ink-100 text-ink-900 hover:bg-ink-200 disabled:opacity-50",
  fantasma: "bg-transparent text-brand-600 hover:bg-brand-50 disabled:opacity-50",
  peligro: "bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50",
};

export const Boton = forwardRef<HTMLButtonElement, Props>(
  ({ variante = "primario", cargando, className = "", children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${estilosPorVariante[variante]} ${className}`}
      {...props}
    >
      {cargando ? "Guardando…" : children}
    </button>
  )
);

Boton.displayName = "Boton";
