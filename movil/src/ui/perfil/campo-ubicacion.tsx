import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useTranslations } from "use-intl";
import type { SugerenciaUbicacion, Ubicacion } from "@/lib/ubicacion";
import { llamarApi } from "~/lib/api";
import { useIdioma } from "~/lib/intl";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/**
 * Como `CampoUbicacion` de la web: solo vale un lugar elegido de la lista (o el del GPS), porque
 * una ubicación sin coordenadas no sirve para buscar por distancia. Las búsquedas pasan por la
 * web (`/api/app/ubicacion`), que llama a Google con la clave del sitio.
 */
export function CampoUbicacion({
  etiqueta,
  valor,
  onCambio,
  error,
}: {
  etiqueta: string;
  valor: Ubicacion | null;
  onCambio: (u: Ubicacion | null) => void;
  error?: string;
}) {
  const t = useTranslations("perfil.ubicacion");
  const color = useColores();
  const { idioma } = useIdioma();
  const [texto, setTexto] = useState(valor?.texto ?? "");
  const [sugerencias, setSugerencias] = useState<SugerenciaUbicacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  // Una sesión de Google por búsqueda: se cobra una sola vez al elegir.
  const sesion = useRef(Crypto.randomUUID());

  useEffect(() => {
    if (valor) setTexto(valor.texto);
  }, [valor]);

  useEffect(() => {
    if (texto.trim().length < 3 || texto === valor?.texto) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const id = setTimeout(async () => {
      const r = await llamarApi<{ sugerencias: SugerenciaUbicacion[] }>("ubicacion", {
        accion: "buscar",
        texto,
        sesion: sesion.current,
        idioma,
      });
      setBuscando(false);
      if (!r.ok) return setErrorBusqueda(t("errorBuscar"));
      setErrorBusqueda(null);
      setSugerencias(r.sugerencias);
    }, 350);
    return () => clearTimeout(id);
  }, [texto, valor?.texto, idioma, t]);

  async function elegir(s: SugerenciaUbicacion) {
    setSugerencias([]);
    setTexto(s.texto);
    const r = await llamarApi<{ ubicacion: Ubicacion }>("ubicacion", {
      accion: "resolver",
      id: s.id,
      sesion: sesion.current,
      idioma,
    });
    sesion.current = Crypto.randomUUID();
    if (!r.ok) return setErrorBusqueda(t("errorResolver"));
    setErrorBusqueda(null);
    onCambio(r.ubicacion);
  }

  async function usarMiUbicacion() {
    setErrorBusqueda(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return setErrorBusqueda(t("sinPermiso"));
    setUbicando(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = await llamarApi<{ ubicacion: Ubicacion }>("ubicacion", {
        accion: "coordenadas",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        idioma,
      });
      if (!r.ok) setErrorBusqueda(t("noIdentificada"));
      else onCambio(r.ubicacion);
    } catch {
      setErrorBusqueda(t("noSeObtuvo"));
    } finally {
      setUbicando(false);
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{etiqueta}</Texto>
      <TextInput
        accessibilityLabel={etiqueta}
        value={texto}
        onChangeText={(v) => {
          setTexto(v);
          // Escribir sin elegir deja el campo sin ubicación resuelta, a propósito.
          if (valor) onCambio(null);
        }}
        placeholder={t("placeholder")}
        placeholderTextColor={color.textoTenue}
        autoCorrect={false}
        style={{
          minHeight: 48,
          borderRadius: radio.campo,
          borderWidth: 1,
          borderColor: error ? color.error : color.borde,
          backgroundColor: color.fondoSutil,
          paddingHorizontal: 14,
          fontFamily: fuente.normal,
          fontSize: 16,
          color: color.texto,
        }}
      />
      {buscando && <Texto variante="chico">{t("buscandoLugares")}</Texto>}
      {sugerencias.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, overflow: "hidden" }}>
          {sugerencias.map((s, i) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => elegir(s)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: pressed ? color.fondoSutil : color.superficie,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: color.borde,
              })}
            >
              <Texto>{s.texto}</Texto>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={usarMiUbicacion}
        disabled={ubicando}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
      >
        {ubicando ? (
          <ActivityIndicator size="small" color={color.textoTenue} />
        ) : (
          <Ionicons name="locate-outline" size={16} color={color.textoTenue} />
        )}
        <Texto variante="chico" style={{ textDecorationLine: "underline" }}>
          {ubicando ? t("buscandoTuUbicacion") : t("usarMiUbicacion")}
        </Texto>
      </Pressable>
      {(error || errorBusqueda) && <Texto variante="error">{errorBusqueda ?? error}</Texto>}
    </View>
  );
}
