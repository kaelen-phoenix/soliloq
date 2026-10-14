import * as Notifications from "expo-notifications";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { abrirDestino } from "./destinos";
import { useSesion } from "./sesion";
import { registrar, registrarToken } from "./push-token";

/**
 * Notificaciones push de la app (#389). Android las recibe por Firebase Cloud Messaging: el
 * teléfono se registra con su token en `dispositivos_push` (0114) y el servidor le manda los
 * mismos avisos que a la web (`enviarPush`, `src/lib/push-servidor.ts`). iPhone necesita la
 * cuenta de Apple (#390); hasta entonces no se registra.
 */

// Con la app abierta también se muestran (el chat abierto ya tiene sus avisos en vivo).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DISPONIBLE = Platform.OS === "android";
export type EstadoPush = "no-disponible" | "sin-decidir" | "activadas" | "denegadas";

/**
 * Se monta con la cuenta adentro de la app. La primera vez pide permiso (como cualquier app); si
 * ya lo dio, registra el teléfono. Al tocar una notificación, abre su pantalla.
 */
function usePushNativa(activo: boolean) {
  const [estado, setEstado] = useState<EstadoPush>(DISPONIBLE ? "sin-decidir" : "no-disponible");

  const activar = useCallback(async () => {
    if (!DISPONIBLE) return;
    await Notifications.setNotificationChannelAsync("default", {
      name: "Yalope",
      importance: Notifications.AndroidImportance.HIGH,
    });
    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) permiso = await Notifications.requestPermissionsAsync();
    setEstado(permiso.granted ? "activadas" : permiso.canAskAgain ? "sin-decidir" : "denegadas");
    if (permiso.granted) await registrar();
  }, []);

  useEffect(() => {
    if (!activo || !DISPONIBLE) return;
    activar();
    // Si Firebase renueva el token, se registra el nuevo (el que trae el aviso: pedirlo otra vez
    // dispara otro aviso y arma un bucle, #406).
    const renovado = Notifications.addPushTokenListener(({ data }) => registrarToken(data));
    return () => renovado.remove();
  }, [activo, activar]);

  // Tocar una notificación: con la app abierta o en segundo plano, y al abrirla desde cero.
  useEffect(() => {
    if (!activo || !DISPONIBLE) return;
    const abrir = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === "string") abrirDestino(url);
    };
    Notifications.getLastNotificationResponseAsync().then(abrir);
    const toque = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => toque.remove();
  }, [activo]);

  return { estado, activar };
}

const Contexto = createContext<{ estado: EstadoPush; activar: () => Promise<void> }>({
  estado: "no-disponible",
  activar: async () => {},
});

/** Una sola vez, en la raíz: activa las push cuando la cuenta entra a la app. */
export function ProveedorPush({ children }: { children: React.ReactNode }) {
  const { destino } = useSesion();
  const valor = usePushNativa(destino === "app");
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** El estado de las push en este teléfono (Ajustes). */
export const usePush = () => useContext(Contexto);
