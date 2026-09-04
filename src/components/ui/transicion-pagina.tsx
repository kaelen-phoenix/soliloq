"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { usePrefiereReduccion } from "./movimiento";

/**
 * Envuelve el contenido del área autenticada y le da una transición corta al cambiar de
 * pantalla. Con `prefers-reduced-motion` no anima: el contenido aparece directo.
 *
 * Sin `AnimatePresence mode="wait"`: con el App Router esa combinación deja la pantalla
 * en blanco hasta refrescar. Cada ruta con `loading.tsx` es un límite de Suspense, y al
 * navegar hacia ella el `motion.div` entrante se monta suspendido mientras `mode="wait"`
 * sigue esperando el `exit` del saliente; cuando resuelve, el `animate` no llega a
 * dispararse y la página queda montada en `opacity: 0`. (El full reload no pasa por acá
 * —`AnimatePresence initial={false}`— por eso "actualizar" lo arreglaba.)
 *
 * `key={pathname}` en un `motion.div` suelto remonta el contenedor en cada navegación y
 * vuelve a correr `initial → animate`, sin depender de ningún `exit`.
 */
export function TransicionPagina({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefiereReduccion = usePrefiereReduccion();

  if (prefiereReduccion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
