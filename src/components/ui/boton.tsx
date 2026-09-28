"use client";

import { forwardRef } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  /** Texto mientras carga, cuando "Guardando…" no describe la acción. */
  textoCargando?: string;
}

// #217: píldoras, como en la referencia visual. El primario lleva el degradé de marca
// (`.bg-accion` en `globals.css`); el secundario es un contorno que se enciende en el
// acento al pasar por encima.
const estilosPorVariante: Record<Variante, string> = {
  primario: "bg-accion font-semibold text-accion-texto hover:brightness-110 disabled:opacity-40",
  secundario:
    "border border-borde bg-superficie text-texto hover:border-[color:var(--acento)] hover:bg-fondo-sutil disabled:opacity-50",
  fantasma: "text-texto-tenue hover:bg-fondo-sutil disabled:opacity-50",
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
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${estilosPorVariante[variante]} ${className}`}
      {...props}
    >
      {cargando ? textoCargando : children}
    </button>
  )
);

Boton.displayName = "Boton";
