import { Redirect, useGlobalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";
import { canjearCallback } from "~/lib/google";
import { useColores } from "~/ui/tema";

/**
 * Cuando el navegador vuelve de Google, Android a veces abre la app por este enlace en lugar de
 * devolvérselo a `openAuthSessionAsync`: se canjea acá (si ya se canjeó, no pasa nada).
 */
export default function Callback() {
  const color = useColores();
  const { code } = useGlobalSearchParams<{ code?: string }>();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      // Si `ingresarConGoogle` ya lo está canjeando, espera ese mismo canje (no hace otro).
      if (code) await canjearCallback(Linking.createURL("auth/callback", { queryParams: { code } }));
      setListo(true);
    })();
  }, [code]);

  if (listo) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie }}>
      <ActivityIndicator color={color.texto} />
    </View>
  );
}
