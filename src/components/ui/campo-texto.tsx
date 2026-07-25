"use client";

import { forwardRef } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
}

export const CampoTexto = forwardRef<HTMLInputElement, Props>(
  ({ etiqueta, error, id, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={id}
        className={`rounded-xl border px-4 py-3 text-base text-ink-900 outline-none transition-colors focus:border-brand-500 ${
          error ? "border-red-400" : "border-ink-100"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);

CampoTexto.displayName = "CampoTexto";
