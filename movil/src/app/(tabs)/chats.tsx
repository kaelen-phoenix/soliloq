import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { useTranslations } from "use-intl";
import type { SalaItem } from "@/lib/salas-reglas";
import { useSesion } from "~/lib/sesion";
import { Campanita } from "~/ui/notificaciones/campanita";
import { Pantalla } from "~/ui/pantalla";
import { leerSalas } from "~/ui/salas/leer-salas";
import { ListaSalas } from "~/ui/salas/lista-salas";
import { useNoLeidos } from "~/ui/salas/no-leidos";
import { Texto } from "~/ui/texto";
import { useColores } from "~/ui/tema";

/** Los chats (`/salas` de la web): todos en una lista; la etiqueta dice cuáles son tuyos (#288). */
export default function Chats() {
  const t = useTranslations("chats.paginas");
  const tTitulos = useTranslations("titulos");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const { revision } = useNoLeidos();
  const [salas, setSalas] = useState<SalaItem[] | null>(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setSalas(
      await leerSalas(userId, {
        sinCompletar: t("perfilSinCompletar"),
        separador: t("separadorNombres"),
        proyecto: t("proyecto"),
      }),
    );
  }, [userId, t]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // #216: con cada mensaje nuevo se relee la vista previa y el orden por actividad.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    cargar();
  }, [revision, cargar]);

  return (
    <Pantalla
      refreshControl={
        <RefreshControl
          refreshing={recargando}
          tintColor={color.texto}
          onRefresh={async () => {
            setRecargando(true);
            await cargar();
            setRecargando(false);
          }}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Texto variante="titulo" accessibilityRole="header">
          {tTitulos("salas")}
        </Texto>
        <Campanita />
      </View>
      {salas === null || !userId ? (
        <ActivityIndicator color={color.texto} style={{ marginTop: 40 }} />
      ) : salas.length === 0 ? (
        <View style={{ alignItems: "center", gap: 8, marginTop: 40, paddingHorizontal: 12 }}>
          <Ionicons name="chatbubbles-outline" size={36} color={color.textoTenue} />
          <Texto variante="subtitulo" style={{ textAlign: "center" }}>
            {t("vacioTitulo")}
          </Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>
            {t("vacioDetalle")}
          </Texto>
        </View>
      ) : (
        <ListaSalas salas={salas} userId={userId} onCambio={cargar} />
      )}
    </Pantalla>
  );
}
