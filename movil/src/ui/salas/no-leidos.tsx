import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, View, type ColorValue } from "react-native";
import { contarNoLeidos, textoBadge, type FilaNoLeidos } from "@/lib/salas-reglas";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Texto } from "../texto";
import { fuente, useColores } from "../tema";
import { suscribirConSesion } from "./realtime";

interface ValorNoLeidos {
  /** Mensajes sin leer por sala. */
  porSala: Map<string, number>;
  /** Suma de todas las salas: el número del badge de «Chats». */
  total: number;
  /** Sube con cada mensaje nuevo de cualquier sala propia: la lista la usa para recargar. */
  revision: number;
  marcarLeida: (salaId: string) => void;
}

const Contexto = createContext<ValorNoLeidos>({ porSala: new Map(), total: 0, revision: 0, marcarLeida: () => {} });

/**
 * Los mensajes sin leer de los chats (#216), como `ProveedorNoLeidos` de la web: un solo canal
 * de Realtime y un solo conteo para la pestaña, la lista y el chat abierto. Solo trabaja con la
 * cuenta adentro de la app (con la cuenta a medio armar no hay chats).
 */
export function ProveedorNoLeidos({ children }: { children: React.ReactNode }) {
  const { sesion, destino } = useSesion();
  const userId = destino === "app" ? sesion?.user.id : undefined;
  const [filas, setFilas] = useState<FilaNoLeidos[]>([]);
  const [revision, setRevision] = useState(0);
  // Una recarga que salió antes de marcar una sala leída no la vuelve a encender.
  const generacion = useRef(0);
  // La sala abierta no cuenta: el chat la marca leída a medida que llegan mensajes.
  const pathname = usePathname();
  const salaAbierta = pathname.match(/^\/salas\/([^/]+)$/)?.[1] ?? null;

  const recargar = useCallback(async () => {
    const mia = ++generacion.current;
    const { data, error } = await supabase.rpc("salas_no_leidas");
    if (mia !== generacion.current || error) return;
    setFilas((data ?? []) as FilaNoLeidos[]);
  }, []);

  useEffect(() => {
    if (!userId) {
      setFilas([]);
      return;
    }
    // Realtime aplica las policies de `mensajes`: solo llegan los de salas propias.
    const cerrar = suscribirConSesion(() =>
      supabase
        .channel(`no-leidos-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (p) => {
          setRevision((r) => r + 1);
          if ((p.new as { autor_id?: string }).autor_id !== userId) recargar();
        })
        // Lo que llegó antes de que el canal escuchara se recupera al suscribirse.
        .subscribe((estado) => {
          if (estado === "SUBSCRIBED") recargar();
        }),
    );
    // El canal no ve lo que pasó con la app en segundo plano o el teléfono bloqueado.
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") recargar();
    });
    return () => {
      cerrar();
      sub.remove();
    };
  }, [userId, recargar]);

  const marcarLeida = useCallback(
    (salaId: string) => {
      generacion.current++;
      setFilas((prev) => prev.filter((f) => f.sala_id !== salaId));
      supabase.rpc("marcar_sala_leida", { p_sala_id: salaId }).then(() => {
        // Con la marca ya escrita, el conteo del servidor es la fuente de verdad.
        recargar();
      });
    },
    [recargar],
  );

  const valor = useMemo(() => {
    const { porSala, total } = contarNoLeidos(filas, salaAbierta);
    return { porSala, total, revision, marcarLeida };
  }, [filas, salaAbierta, revision, marcarLeida]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useNoLeidos = () => useContext(Contexto);

/** El badge con la cantidad (tope «9+»), como `BadgeNoLeidos` de la web. */
export function BadgeNoLeidos({ cantidad, flotante = false }: { cantidad: number; flotante?: boolean }) {
  const color = useColores();
  if (cantidad <= 0) return null;
  return (
    <View
      style={[
        {
          minWidth: 17,
          height: 17,
          borderRadius: 9,
          paddingHorizontal: 4,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#e62d03",
        },
        flotante && { position: "absolute", top: -4, right: -9, borderWidth: 2, borderColor: color.superficie },
      ]}
    >
      <Texto style={{ fontFamily: fuente.semi, fontSize: 10, lineHeight: 12, color: "#ffffff" }}>
        {textoBadge(cantidad)}
      </Texto>
    </View>
  );
}

/** El ícono de la pestaña «Chats» con el total sin leer (`tabBarIcon`). */
export function IconoChats({ color: tinte, size }: { color: ColorValue; size: number }) {
  const { total } = useNoLeidos();
  return (
    <View>
      <Ionicons name="chatbubbles-outline" color={tinte as string} size={size} />
      <BadgeNoLeidos cantidad={total} flotante />
    </View>
  );
}
