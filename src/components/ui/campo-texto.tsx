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
        className={`rounded-xl border bg-white px-3.5 py-2.5 text-base text-ink-900 transition-colors placeholder:text-ink-400 focus:border-ink-900 ${
          error ? "border-error-400" : "border-ink-200"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  )
);

CampoTexto.displayName = "CampoTexto";
