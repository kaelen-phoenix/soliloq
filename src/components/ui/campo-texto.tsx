"use client";

import { forwardRef } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
}

export const CampoTexto = forwardRef<HTMLInputElement, Props>(
  ({ etiqueta, error, id, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={id}
        className={`rounded-xl border bg-superficie px-3.5 py-2.5 text-base text-texto transition-colors placeholder:text-texto-tenue focus:border-ink-900 ${
          error ? "border-error-400" : "border-borde"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  )
);

CampoTexto.displayName = "CampoTexto";
