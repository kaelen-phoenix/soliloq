"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Suma una visita al enlace público (#384). Corre en el navegador de quien lo abre: así no
 * cuentan las vistas previas que arman WhatsApp o las redes (no ejecutan JavaScript), y una
 * recarga de la misma pestaña tampoco suma dos veces. No se guarda quién visita, solo cuántas
 * veces se abrió por día; las del propio dueño no cuentan (`registrar_visita_enlace`, 0113).
 */
export function ContarVisita({ clave }: { clave: string }) {
  useEffect(() => {
    const marca = `yalope-visita-${clave.toLowerCase()}`;
    try {
      if (sessionStorage.getItem(marca)) return;
      sessionStorage.setItem(marca, "1");
    } catch {
      // Sin almacenamiento de la sesión, se cuenta igual.
    }
    createClient()
      .rpc("registrar_visita_enlace", { p_clave: clave })
      .then(() => {
        // Si no se pudo contar no pasa nada: el perfil se ve igual.
      });
  }, [clave]);
  return null;
}
