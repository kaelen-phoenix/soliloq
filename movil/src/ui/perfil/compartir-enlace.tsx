import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTranslations } from "use-intl";
import { aAlias, aliasValido, errorAlias as claveErrorAlias } from "@/lib/enlace-publico";
import { supabase } from "~/lib/supabase";
import { URL_WEB } from "~/lib/web";
import { Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/** Un id nuevo para el enlace (como `crypto.randomUUID()` de la web). */
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Compartir el perfil propio con un enlace que se ve sin cuenta (#384), como `BotonCompartir`
 * de la web: nombre propio del enlace, compartir (con el menú del teléfono), copiar, QR, cambiar
 * el código y desactivar. Las visitas, solo con el enlace activo.
 */
export function CompartirEnlace({
  userId,
  nombre,
  tokenInicial,
  activoInicial,
  aliasInicial,
  visitas,
}: {
  userId: string;
  nombre: string;
  tokenInicial: string;
  activoInicial: boolean;
  aliasInicial: string | null;
  visitas: { ultimos30: number; total: number };
}) {
  const t = useTranslations("perfil.compartir");
  const color = useColores();
  const [token, setToken] = useState(tokenInicial);
  const [activo, setActivo] = useState(activoInicial);
  const [alias, setAlias] = useState(aliasInicial);
  const [aliasEditado, setAliasEditado] = useState(aliasInicial ?? aAlias(nombre));
  const [errorAlias, setErrorAlias] = useState<string | null>(null);
  const [aliasGuardado, setAliasGuardado] = useState(false);
  const [guardandoAlias, setGuardandoAlias] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `${URL_WEB}/p/${alias ?? token}`;

  async function actualizar(campos: { enlace_publico_activo?: boolean; enlace_token?: string; enlace_alias?: string | null }) {
    return supabase.from("perfiles").update(campos).eq("id", userId);
  }

  async function activarSiHaceFalta() {
    if (activo) return true;
    const { error: e } = await actualizar({ enlace_publico_activo: true });
    if (e) {
      setError(t("errorActivar"));
      return false;
    }
    setActivo(true);
    return true;
  }

  async function guardarAlias() {
    setErrorAlias(null);
    setAliasGuardado(false);
    const valor = aliasEditado.trim().toLowerCase();
    if (valor && !aliasValido(valor)) return setErrorAlias(t("aliasFormato"));
    setGuardandoAlias(true);
    const { error: e } = await actualizar({ enlace_alias: valor || null });
    setGuardandoAlias(false);
    if (e) return setErrorAlias(t(claveErrorAlias(e.code)));
    setAlias(valor || null);
    setAliasGuardado(true);
  }

  async function compartir() {
    setError(null);
    setCargando(true);
    const ok = await activarSiHaceFalta();
    setCargando(false);
    if (!ok) return;
    // El menú del teléfono ya trae WhatsApp, Instagram, X, Facebook y el resto.
    await Share.share({ message: `${t("textoCompartir", { nombre })} ${url}`, url }).catch(() => {});
  }

  async function copiar() {
    setError(null);
    if (!(await activarSiHaceFalta())) return;
    await Clipboard.setStringAsync(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  async function alternarQr() {
    if (verQr) return setVerQr(false);
    setError(null);
    if (await activarSiHaceFalta()) setVerQr(true);
  }

  async function regenerar() {
    setError(null);
    const nuevo = uuid();
    const { error: e } = await actualizar({ enlace_token: nuevo });
    if (e) return setError(t("errorRegenerar"));
    setToken(nuevo);
  }

  async function desactivar() {
    setError(null);
    const { error: e } = await actualizar({ enlace_publico_activo: false });
    if (e) return setError(t("errorDesactivar"));
    setActivo(false);
    setVerQr(false);
  }

  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="subtitulo">{t("titulo")}</Texto>
          <Texto variante="tenue">{activo ? t("activo") : t("inactivo")}</Texto>
          {activo && <Texto variante="tenue">{t("visitas", { n: visitas.ultimos30, total: visitas.total })}</Texto>}
        </View>
        <Ionicons name="share-social-outline" size={22} color={color.textoTenue} />
      </View>

      {/* #384: el enlace con nombre propio, en lugar del código. */}
      <View style={{ gap: 6 }}>
        <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{t("aliasEtiqueta")}</Texto>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: errorAlias ? color.error : color.borde,
            borderRadius: radio.campo,
            paddingHorizontal: 12,
            backgroundColor: color.fondoSutil,
          }}
        >
          <Texto variante="tenue">yalope.com/p/</Texto>
          <TextInput
            accessibilityLabel={t("aliasEtiqueta")}
            value={aliasEditado}
            onChangeText={(v) => {
              setAliasEditado(v.toLowerCase());
              setAliasGuardado(false);
            }}
            maxLength={40}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 46, fontFamily: fuente.normal, fontSize: 16, color: color.texto }}
          />
        </View>
        <Texto variante="chico">{t("aliasAyuda")}</Texto>
        {aliasGuardado && <Texto style={{ color: color.exito, fontSize: 13 }}>{t("aliasListo")}</Texto>}
        {errorAlias && <Texto variante="error">{errorAlias}</Texto>}
        <Boton variante="secundario" onPress={guardarAlias} cargando={guardandoAlias}>
          {t("aliasGuardar")}
        </Boton>
      </View>

      <Boton onPress={compartir} cargando={cargando}>
        {cargando ? t("unMomento") : t("compartir")}
      </Boton>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Boton variante="secundario" onPress={copiar}>
            {copiado ? t("copiado") : t("copiar")}
          </Boton>
        </View>
        <View style={{ flex: 1 }}>
          <Boton variante="secundario" onPress={alternarQr}>
            {verQr ? t("ocultarQr") : t("codigoQr")}
          </Boton>
        </View>
      </View>

      {verQr && (
        <View style={{ alignItems: "center", gap: 10, padding: 16, borderRadius: radio.tarjeta, backgroundColor: color.fondoSutil }}>
          <View style={{ padding: 12, borderRadius: radio.campo, backgroundColor: "#ffffff" }}>
            <QRCode value={url} size={176} />
          </View>
          <Texto variante="chico" style={{ textAlign: "center" }}>
            {t("qrAyuda")} <Texto variante="chico" style={{ color: color.texto }}>{url}</Texto>
          </Texto>
        </View>
      )}

      {error && <Texto variante="error">{error}</Texto>}

      {activo && (
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={regenerar}>
            {t("regenerar")}
          </Texto>
          <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={desactivar}>
            {t("desactivar")}
          </Texto>
        </View>
      )}
    </Tarjeta>
  );
}
