"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";

/**
 * Aviso del corazón de Convocatorias (#366): se resalta cuando hay un Talento nuevo (un match
 * de un Proyecto o Equipo propio) desde la última vez que la persona entró a `/matches`, y se
 * apaga al entrar. Es independiente de la ventana «Hay interés» y de la campanita: cerrar la
 * ventana no lo apaga. El estado vive en la base (`hay_convocatorias_nuevas`, 0107).
 */
const EVENTO = "yalope:convocatorias-nuevas";

/** Para que el corazón se encienda en el momento, sin esperar a navegar (p.ej. al «Aceptar»). */
export function avisarConvocatoriasNuevas() {
  window.dispatchEvent(new Event(EVENTO));
}

const Contexto = createContext(false);

export function ProveedorConvocatoriasNuevas({
  inicial,
  children,
}: {
  inicial: boolean;
  children: React.ReactNode;
}) {
  const [hay, setHay] = useState(inicial);
  const [revision, setRevision] = useState(0);
  const pathname = usePathname();
  const enConvocatorias = pathname === "/matches" || pathname.startsWith("/matches/");

  useEffect(() => {
    const recontar = () => setRevision((r) => r + 1);
    const alVolver = () => {
      if (document.visibilityState === "visible") recontar();
    };
    window.addEventListener(EVENTO, recontar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener(EVENTO, recontar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    const supabase = createClient();
    if (enConvocatorias) {
      // Entrar a Convocatorias es «verlo»: se apaga ya y queda marcado en la base.
      setHay(false);
      supabase.rpc("marcar_convocatorias_vistas").then(({ error }) => {
        if (error) reportarErrorSupabase(error, { rpc: "marcar_convocatorias_vistas" });
      });
    } else {
      supabase.rpc("hay_convocatorias_nuevas").then(({ data, error }) => {
        if (error) reportarErrorSupabase(error, { rpc: "hay_convocatorias_nuevas" });
        else if (vigente) setHay(data === true);
      });
    }
    return () => {
      vigente = false;
    };
  }, [enConvocatorias, pathname, revision]);

  return <Contexto.Provider value={hay && !enConvocatorias}>{children}</Contexto.Provider>;
}

export function useConvocatoriasNuevas() {
  return useContext(Contexto);
}
