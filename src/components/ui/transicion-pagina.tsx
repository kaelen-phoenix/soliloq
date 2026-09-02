"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { usePrefiereReduccion } from "./movimiento";

/**
 * Envuelve el contenido del área autenticada y le da una transición corta al cambiar de
 * pantalla. Con `prefers-reduced-motion` no anima: el contenido aparece directo, sin
 * pasar por un estado invisible.
 */
export function TransicionPagina({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefiereReduccion = usePrefiereReduccion();

  if (prefiereReduccion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
