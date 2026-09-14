"use client";

import { useEffect, useRef } from "react";

/**
 * El fondo compartido de toda placa/modal de la app: cierra con `Esc`, cierra al tocar
 * afuera (adentro no, gracias al `stopPropagation`), bloquea el scroll del fondo mientras
 * está abierta y devuelve el foco a quien la abrió al cerrarse. Antes cada placa nueva
 * reimplementaba (o se olvidaba de) este comportamiento; ahora es uno solo, como ya hacía
 * `GaleriaFotos`.
 */
export function Superposicion({
  onCerrar,
  children,
  posicion = "centro",
  etiqueta,
}: {
  onCerrar: () => void;
  children: React.ReactNode;
  /** `centro` en toda pantalla; `abajo` pega la tarjeta al piso en mobile (hoja emergente). */
  posicion?: "centro" | "abajo";
  /** `aria-label` del diálogo, para quien usa lector de pantalla. */
  etiqueta?: string;
}) {
  const contenidoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const foco = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    contenidoRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
      foco?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-ink-950/60 ${
        posicion === "abajo" ? "items-end p-0 sm:items-center sm:p-4" : "items-center p-4"
      }`}
      onClick={onCerrar}
    >
      <div
        ref={contenidoRef}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full outline-none"
      >
        {children}
      </div>
    </div>
  );
}
