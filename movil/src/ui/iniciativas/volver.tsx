import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Pressable } from "react-native";
import { Texto } from "../texto";
import { fuente, useColores } from "../tema";

/** «‹ Volver» arriba de las pantallas de Iniciativas. Sin historial, vuelve a la pestaña. */
export function Volver({ texto }: { texto: string }) {
  const color = useColores();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/iniciativas" as Href))}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4 }}
    >
      <Ionicons name="chevron-back" size={18} color={color.textoTenue} />
      <Texto variante="tenue" style={{ fontFamily: fuente.media }}>
        {texto}
      </Texto>
    </Pressable>
  );
}
