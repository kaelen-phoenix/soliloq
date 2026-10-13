import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, type Href } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { BadgeNoLeidos } from "../salas/no-leidos";
import { suscribirConSesion } from "../salas/realtime";
import { useColores } from "../tema";

/**
 * Las notificaciones sin leer (#347), un solo conteo y un solo canal de Realtime (0106) para
 * todas las campanitas, como `CampanitaNotificaciones` de la web: recuenta al montar, al volver
 * a la app, al volver a una pantalla y cuando la lista marca algo leído (`recontar`).
 */
const Contexto = createContext<{ noLeidas: number; recontar: () => void }>({ noLeidas: 0, recontar: () => {} });

export function ProveedorNotificaciones({ children }: { children: React.ReactNode }) {
  const { sesion, destino } = useSesion();
  const userId = destino === "app" ? sesion?.user.id : undefined;
  const [noLeidas, setNoLeidas] = useState(0);
  const [revision, setRevision] = useState(0);
  const recontar = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    if (!userId) return setNoLeidas(0);
    let vigente = true;
    supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", userId)
      .is("leida_en", null)
      .then(({ count, error }) => {
        if (vigente && !error) setNoLeidas(count ?? 0);
      });
    return () => {
      vigente = false;
    };
  }, [userId, revision]);

  useEffect(() => {
    if (!userId) return;
    const cerrar = suscribirConSesion(() =>
      supabase
        .channel(`notificaciones-badge-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${userId}` },
          recontar,
        )
        .subscribe(),
    );
    const sub = AppState.addEventListener("change", (e) => {
      if (e === "active") recontar();
    });
    return () => {
      cerrar();
      sub.remove();
    };
  }, [userId, recontar]);

  const valor = useMemo(() => ({ noLeidas, recontar }), [noLeidas, recontar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useNotificaciones = () => useContext(Contexto);

/** La campanita: lleva a Notificaciones y muestra cuántas hay sin leer. */
export function Campanita() {
  const t = useTranslations("cuenta.layout");
  const color = useColores();
  const { noLeidas, recontar } = useNotificaciones();

  // Al volver a la pantalla que la muestra, recuenta (como la web al navegar).
  useFocusEffect(
    useCallback(() => {
      recontar();
    }, [recontar]),
  );

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={
        noLeidas > 0 ? t("sinLeer", { etiqueta: t("notificaciones"), n: noLeidas }) : t("notificaciones")
      }
      onPress={() => router.push("/notificaciones" as Href)}
      hitSlop={8}
      style={{ padding: 6 }}
    >
      <View>
        <Ionicons name="notifications-outline" size={22} color={color.textoTenue} />
        <BadgeNoLeidos cantidad={noLeidas} flotante />
      </View>
    </Pressable>
  );
}
