"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Un PWA instalado no se "cierra" de verdad al pasar a segundo plano: el sistema lo
 * suspende y lo retoma tal cual estaba, sin volver a pedir nada al servidor — alguien puede
 * quedarse viendo una versión vieja de la app por días sin un cierre explícito.
 *
 * Al volver a foreground (o al restaurarse desde el back-forward cache de Safari, que en
 * iOS es la vía más común) se refresca el árbol de server components de la ruta actual.
 * Es un `router.refresh()`, no una recarga completa: sólo vuelve a pedir el RSC de lo que ya
 * está montado, así que no se pierde el estado de client components que no dependa del
 * servidor (por ejemplo, un formulario a medio completar en otra pestaña).
 */
export function ActualizarAlVolver() {
  const router = useRouter();

  useEffect(() => {
    function alVolverAForeground() {
      if (document.visibilityState === "visible") router.refresh();
    }
    function alRestaurarDesdeCache(evento: PageTransitionEvent) {
      if (evento.persisted) router.refresh();
    }
    document.addEventListener("visibilitychange", alVolverAForeground);
    window.addEventListener("pageshow", alRestaurarDesdeCache);
    return () => {
      document.removeEventListener("visibilitychange", alVolverAForeground);
      window.removeEventListener("pageshow", alRestaurarDesdeCache);
    };
  }, [router]);

  return null;
}
