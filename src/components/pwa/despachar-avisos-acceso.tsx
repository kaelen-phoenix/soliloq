"use client";

import { useEffect } from "react";
import { despacharAvisosDeAcceso } from "@/app/acciones-push";

/**
 * Dispara el push de los avisos de acceso (#248) después de que la pantalla ya se mostró:
 * así `/solicitud-pendiente` nunca espera a un servicio de push lento (review de #271). No
 * pinta nada; si falla, el aviso queda pendiente y lo reintenta la próxima llamada.
 */
export function DespacharAvisosAcceso() {
  useEffect(() => {
    void despacharAvisosDeAcceso().catch(() => {});
  }, []);
  return null;
}
