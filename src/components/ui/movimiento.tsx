"use client";

import { useReducedMotion, type Variants } from "framer-motion";

/**
 * Punto único del movimiento de la app. Cada animación de entrada, transición o feedback
 * de toque sale de acá, y todo pasa por `usePrefiereReduccion`: con la preferencia del
 * sistema activa, las variantes no desplazan ni funden, y —clave— nunca dejan un elemento
 * en `opacity: 0`, así nada queda oculto esperando una animación que no corre.
 */

export function usePrefiereReduccion(): boolean {
  return useReducedMotion() ?? false;
}

/** Contenedor de una lista o grilla: escalona la entrada de sus hijos. */
export const entradaLista: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Cada ítem de una lista: sube y aparece. */
export const entradaItem: Variants = {
  oculto: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
};

/** Feedback de toque para botones y tarjetas. Pasar a `whileTap`. */
export const toque = { scale: 0.98 };

/**
 * Devuelve variantes neutras cuando hay que reducir movimiento: mismo contrato
 * (`oculto` / `visible`) pero sin transform ni fundido, para que el `initial="oculto"`
 * de un consumidor no esconda nada.
 */
export function variantesSeguras(prefiereReduccion: boolean): {
  lista: Variants;
  item: Variants;
} {
  if (prefiereReduccion) {
    const neutro: Variants = { oculto: {}, visible: {} };
    return { lista: neutro, item: neutro };
  }
  return { lista: entradaLista, item: entradaItem };
}
