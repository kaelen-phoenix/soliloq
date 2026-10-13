import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { llamarApi } from "~/lib/api";
import { Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente } from "../tema";

const RESULTADOS = ["vinculado", "en-uso", "cancelado", "error", "no-configurado"];

/**
 * «Vincular mi Discord» (#269, #395), como en el Perfil de la web. La app pide a la web un
 * enlace firmado con su sesión, lo abre en el navegador del sistema y Discord vuelve a la app
 * por `<esquema>://perfil?discord=<resultado>`.
 */
export function VincularDiscord({ usuario, alCambiar }: { usuario: string | null; alCambiar: () => void }) {
  const t = useTranslations("chats.vincularDiscord");
  const tDiscord = useTranslations("chats.accionesDiscord");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function vincular() {
    setOcupado(true);
    setMensaje(null);
    const esquema = Constants.expoConfig?.scheme as string;
    const r = await llamarApi<{ url: string }>("discord", { accion: "enlace-vincular", esquema });
    if (!r.ok) {
      setOcupado(false);
      return setMensaje(t("resultados.error"));
    }
    const vuelta = await WebBrowser.openAuthSessionAsync(r.url, `${esquema}://perfil`);
    setOcupado(false);
    if (vuelta.type !== "success") return;
    const resultado = Linking.parse(vuelta.url).queryParams?.discord;
    if (typeof resultado === "string" && RESULTADOS.includes(resultado)) setMensaje(t(`resultados.${resultado}`));
    alCambiar();
  }

  async function desvincular() {
    setOcupado(true);
    const r = await llamarApi("discord", { accion: "desvincular" });
    setOcupado(false);
    if (!r.ok) return setMensaje(tDiscord("errorDesvincular"));
    setMensaje(null);
    alCambiar();
  }

  return (
    <Tarjeta>
      {usuario ? (
        <View style={{ gap: 8 }}>
          <Texto>
            {t.rich("vinculadoComo", { usuario, b: (x) => <Texto style={{ fontFamily: fuente.semi }}>{x}</Texto> })}
          </Texto>
          <Boton variante="secundario" onPress={desvincular} cargando={ocupado}>
            {ocupado ? t("desvinculando") : t("desvincular")}
          </Boton>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Texto variante="chico">{t("ayuda")}</Texto>
          <Boton variante="secundario" onPress={vincular} cargando={ocupado}>
            {t("boton")}
          </Boton>
        </View>
      )}
      {mensaje && <Texto variante="chico">{mensaje}</Texto>}
    </Tarjeta>
  );
}
