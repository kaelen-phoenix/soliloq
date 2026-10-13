import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTranslations } from "use-intl";
import { color, fuente } from "~/ui/tema";

type NombreIcono = React.ComponentProps<typeof Ionicons>["name"];

function icono(nombre: NombreIcono) {
  return function IconoPestana({ color: tinte, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} color={tinte as string} size={size} />;
  };
}

/** La barra de la web (#310, #380): Explorar · Chats · Iniciativas · Convocatorias · Perfil. */
export default function Pestanas() {
  const t = useTranslations("nav");
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.superficie },
        tabBarStyle: { backgroundColor: color.superficie, borderTopColor: color.borde },
        tabBarActiveTintColor: color.marca,
        tabBarInactiveTintColor: color.textoTenue,
        tabBarLabelStyle: { fontFamily: fuente.media, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("convocatoriasCorto"), tabBarIcon: icono("compass-outline") }} />
      <Tabs.Screen name="chats" options={{ title: t("salas"), tabBarIcon: icono("chatbubbles-outline") }} />
      <Tabs.Screen
        name="iniciativas"
        options={{ title: t("iniciativasCorto"), tabBarIcon: icono("albums-outline") }}
      />
      <Tabs.Screen name="convocatorias" options={{ title: t("matches"), tabBarIcon: icono("heart-outline") }} />
      <Tabs.Screen name="perfil" options={{ title: t("perfil"), tabBarIcon: icono("person-outline") }} />
    </Tabs>
  );
}
