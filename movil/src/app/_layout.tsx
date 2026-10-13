import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { ProveedorIdioma } from "~/lib/intl";
import { ProveedorSesion, useSesion } from "~/lib/sesion";
import { ProveedorTema, useColores, useTema } from "~/ui/tema";

SplashScreen.preventAutoHideAsync();

/**
 * Las guardas de la web (`destinoSegunEstado`, middleware) en una sola pila: sin sesión,
 * ingresar; con la cuenta a medio armar, el paso que falta; con todo listo, la app.
 */
function Navegacion() {
  const color = useColores();
  const { oscuro } = useTema();
  const { sesion, destino } = useSesion();
  const [fuentesListas] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Baloo2_800ExtraBold,
  });
  // La pantalla de carga sigue hasta saber a dónde va cada quien.
  const listo = fuentesListas && sesion !== undefined && (!sesion || destino !== null);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!fuentesListas || sesion === undefined) return null;
  const barra = <StatusBar style={oscuro ? "light" : "dark"} />;
  // Recién ingresó: un instante mientras se lee el estado de la cuenta.
  if (!listo) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie }}>
        {barra}
        <ActivityIndicator color={color.texto} />
      </View>
    );
  }

  return (
    <>
      {barra}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.superficie } }}>
      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="ingresar" />
        <Stack.Screen name="recuperar" />
      </Stack.Protected>
      <Stack.Protected guard={!!sesion && destino !== "app"}>
        <Stack.Screen name="estado" />
      </Stack.Protected>
      <Stack.Protected guard={!!sesion && destino === "app"}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ajustes" />
      </Stack.Protected>
      {/* Como en la web, cambiar la contraseña está disponible con la cuenta a medio armar. */}
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="cambiar-clave" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
      </Stack>
    </>
  );
}

export default function Raiz() {
  return (
    <ProveedorTema>
      <ProveedorIdioma>
        <ProveedorSesion>
          <Navegacion />
        </ProveedorSesion>
      </ProveedorIdioma>
    </ProveedorTema>
  );
}
