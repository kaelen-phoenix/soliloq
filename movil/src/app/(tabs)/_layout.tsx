import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs, usePathname } from "expo-router";
import type { ColorValue } from "react-native";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { AvisoConvocatoria } from "~/ui/explorar/convocatoria";
import { IconoChats } from "~/ui/salas/no-leidos";
import { useConvocatoriasNuevas } from "~/ui/talento/convocatorias-nuevas";
import { fuente, useColores } from "~/ui/tema";

type NombreIcono = React.ComponentProps<typeof Ionicons>["name"];

function icono(nombre: NombreIcono) {
  return function IconoPestana({ color: tinte, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} color={tinte as string} size={size} />;
  };
}

/** La barra de la web (#310, #380): Explorar · Chats · Iniciativas · Convocatorias · Perfil. */
export default function Pestanas() {
  const color = useColores();
  const t = useTranslations("nav");
  const { sesion } = useSesion();
  // #366: el corazón de Convocatorias se resalta con talento nuevo sin ver.
  const hayConvocatoriasNuevas = useConvocatoriasNuevas(usePathname().startsWith("/convocatorias"));
  return (
    <>
    {/* La convocatoria definitiva que llega mientras se usa la app (como en el layout de la web). */}
    {sesion && <AvisoConvocatoria userId={sesion.user.id} alAceptar={() => router.push("/chats")} />}
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
      <Tabs.Screen name="chats" options={{ title: t("salas"), tabBarIcon: IconoChats }} />
      <Tabs.Screen
        name="iniciativas"
        options={{ title: t("iniciativasCorto"), tabBarIcon: icono("albums-outline") }}
      />
      <Tabs.Screen
        name="convocatorias"
        options={{ title: t("matches"), tabBarIcon: icono(hayConvocatoriasNuevas ? "heart" : "heart-outline") }}
      />
      <Tabs.Screen name="perfil" options={{ title: t("perfil"), tabBarIcon: icono("person-outline") }} />
    </Tabs>
    </>
  );
}
