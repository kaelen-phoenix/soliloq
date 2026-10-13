import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "~/lib/supabase";

/**
 * El corazón de Convocatorias (#366): se resalta con un Talento nuevo desde la última vez que se
 * entró a Convocatorias, y se apaga al entrar. El estado vive en la base
 * (`hay_convocatorias_nuevas`, 0107), igual que en la web.
 */
const oyentes = new Set<() => void>();

/** Para que el corazón se encienda en el momento (p. ej. al «Aceptar» un match en Buscar talento). */
export function avisarConvocatoriasNuevas() {
  oyentes.forEach((f) => f());
}

// La marca de «visto» en vuelo: la lectura siguiente la espera, así entrar y salir rápido de
// Convocatorias no vuelve a encender el corazón con lo que se acaba de ver.
let marcando: Promise<unknown> = Promise.resolve();

/** Lo llama la pantalla de Convocatorias al enfocarse: entrar es «verlo». */
export function marcarConvocatoriasVistas() {
  marcando = Promise.resolve(supabase.rpc("marcar_convocatorias_vistas"));
  avisarConvocatoriasNuevas();
}

/** Para la pestaña (`tabBarBadge`): `true` si hay algo nuevo y no se está en Convocatorias. */
export function useConvocatoriasNuevas(enConvocatorias: boolean): boolean {
  const [hay, setHay] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const recontar = () => setRevision((r) => r + 1);
    oyentes.add(recontar);
    const sub = AppState.addEventListener("change", (e) => e === "active" && recontar());
    return () => {
      oyentes.delete(recontar);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (enConvocatorias) {
      setHay(false);
      return;
    }
    let vigente = true;
    marcando
      .then(() => supabase.rpc("hay_convocatorias_nuevas"))
      .then(({ data, error }) => {
        if (vigente && !error) setHay(data === true);
      });
    return () => {
      vigente = false;
    };
  }, [enConvocatorias, revision]);

  return hay && !enConvocatorias;
}
