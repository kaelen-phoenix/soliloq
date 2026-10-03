"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { suscribirConSesion } from "@/lib/supabase/realtime";
import { reportarErrorSupabase } from "@/lib/observabilidad";

/** Una fila de `salas_no_leidas()` (0082): solo vienen las salas con algo sin leer. */
export interface FilaNoLeidos {
  sala_id: string;
  no_leidos: number;
  es_de_iniciativa: boolean;
  es_dueno: boolean;
}

interface ValorNoLeidos {
  /** Mensajes sin leer por sala. */
  porSala: Map<string, number>;
  /** Suma de todas las salas: es el número del badge de "Chats". */
  total: number;
  /** Sube con cada mensaje nuevo de cualquier sala propia, aunque no cambie el total: la
   *  lista de `/salas` lo usa para refrescar la vista previa y el orden por actividad. */
  revision: number;
  marcarLeida: (salaId: string) => void;
}

const ContextoNoLeidos = createContext<ValorNoLeidos>({
  porSala: new Map(),
  total: 0,
  revision: 0,
  marcarLeida: () => {},
});

/**
 * Estado de mensajes sin leer de Salas (#216), compartido por la barra inferior, la lateral,
 * la lista de `/salas` y el chat abierto: un solo canal de Realtime y un solo conteo, en vez
 * de que cada uno pregunte por su lado y muestren números distintos.
 */
export function ProveedorNoLeidos({
  userId,
  inicial,
  children,
}: {
  userId: string;
  inicial: FilaNoLeidos[];
  children: React.ReactNode;
}) {
  const [filas, setFilas] = useState(inicial);
  const [revision, setRevision] = useState(0);
  // Generación de las recargas: marcar una sala leída la sube, así una recarga que salió
  // antes de la marca (y trae el `leido_hasta` viejo) no vuelve a encender la sala.
  const generacion = useRef(0);
  const pathname = usePathname();
  // La sala que está abierta no cuenta: el chat la marca leída a medida que llegan
  // mensajes, y sin esto el badge parpadearía entre el INSERT y esa marca.
  const salaAbierta = pathname.match(/^\/salas\/([^/]+)$/)?.[1] ?? null;

  const recargar = useCallback(async () => {
    const supabase = createClient();
    const mia = ++generacion.current;
    const { data, error } = await supabase.rpc("salas_no_leidas");
    if (mia !== generacion.current) return;
    if (error) {
      reportarErrorSupabase(error, { rpc: "salas_no_leidas" });
      return;
    }
    setFilas((data ?? []) as FilaNoLeidos[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // Realtime aplica las policies de `mensajes`: solo llegan los de salas propias.
    const cerrarCanal = suscribirConSesion(supabase, () =>
      supabase
        .channel(`no-leidos-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (p) => {
          setRevision((r) => r + 1);
          if ((p.new as { autor_id?: string }).autor_id !== userId) recargar();
        })
        // Lo que llegó entre el render del servidor y que el canal quedó escuchando no pasa
        // por el callback de arriba: se recupera recargando al suscribirse (igual que SalaChat).
        .subscribe((estado) => {
          if (estado === "SUBSCRIBED") recargar();
        }),
    );

    // El canal no ve lo que pasó con la pestaña en segundo plano o el teléfono bloqueado.
    function alVolver() {
      if (document.visibilityState === "visible") recargar();
    }
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      cerrarCanal();
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [userId, recargar]);

  const marcarLeida = useCallback(
    (salaId: string) => {
      generacion.current++;
      setFilas((prev) => prev.filter((f) => f.sala_id !== salaId));
      createClient()
        .rpc("marcar_sala_leida", { p_sala_id: salaId })
        .then(({ error }) => {
          if (error) reportarErrorSupabase(error, { rpc: "marcar_sala_leida", salaId });
          // Con la marca ya escrita, el conteo del servidor es la fuente de verdad.
          recargar();
        });
    },
    [recargar],
  );

  const valor = useMemo(() => {
    const porSala = new Map<string, number>();
    for (const f of filas) {
      // #288: sin modos, cuentan todas las salas (antes se filtraban por Talento/Creador).
      if (f.sala_id !== salaAbierta && f.no_leidos > 0) {
        porSala.set(f.sala_id, f.no_leidos);
      }
    }
    let total = 0;
    porSala.forEach((n) => (total += n));
    return { porSala, total, revision, marcarLeida };
  }, [filas, salaAbierta, revision, marcarLeida]);

  return <ContextoNoLeidos.Provider value={valor}>{children}</ContextoNoLeidos.Provider>;
}

export function useNoLeidos() {
  return useContext(ContextoNoLeidos);
}

/** Badge rojo con la cantidad (tope "9+"), para colgar de un ícono con `relative`. */
export function BadgeNoLeidos({ cantidad, className = "" }: { cantidad: number; className?: string }) {
  if (cantidad <= 0) return null;
  return (
    <span
      className={`flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-2xs font-semibold leading-none text-white ring-2 ring-superficie ${className}`}
    >
      {cantidad > 9 ? "9+" : cantidad}
    </span>
  );
}
