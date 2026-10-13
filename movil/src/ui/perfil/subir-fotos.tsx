import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import {
  BUCKET_FOTOS,
  MAX_FOTOS,
  reordenarConPrincipal,
  siguienteOrden,
  type FotoTalento,
} from "@/lib/perfil-talento";
import { supabase } from "~/lib/supabase";
import { comprimirFoto } from "../comprimir-foto";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/**
 * Como `SubirFotos` de la web: hasta `MAX_FOTOS`, varias a la vez, la primera es la principal.
 * Se achican y comprimen en el teléfono antes de subirlas. En el alta solo van a Storage (la
 * fila en `fotos_talento` se crea al completar); al editar se guardan al toque.
 */
export function SubirFotos({
  talentoId,
  fotos,
  onCambio,
  persistir,
}: {
  talentoId: string;
  fotos: FotoTalento[];
  onCambio: (f: FotoTalento[] | ((prev: FotoTalento[]) => FotoTalento[])) => void;
  persistir: boolean;
}) {
  const t = useTranslations("perfil.fotos");
  const color = useColores();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);

  async function subirUna(uri: string, ancho: number, alto: number, orden: number): Promise<FotoTalento | string> {
    const foto = await comprimirFoto(uri, ancho, alto);
    if (!foto) return t("errorSubir");

    const ruta = `${talentoId}/${Crypto.randomUUID()}.jpg`;
    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(ruta, foto, { contentType: "image/jpeg" });
    if (errorSubida) return t("errorSubir");
    const url = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
    if (!persistir) return { id: Crypto.randomUUID(), storage_path: ruta, orden, url, enBd: false };

    const { data: fila, error: errorInsert } = await supabase
      .from("fotos_talento")
      .insert({ talento_id: talentoId, storage_path: ruta, orden })
      .select("id")
      .single();
    if (errorInsert || !fila) {
      await supabase.storage.from(BUCKET_FOTOS).remove([ruta]);
      return t("errorGuardar");
    }
    return { id: fila.id, storage_path: ruta, orden, url, enBd: true };
  }

  async function agregar() {
    setError(null);
    const lugares = MAX_FOTOS - fotos.length;
    if (lugares <= 0) return setError(t("maximo", { max: MAX_FOTOS }));
    const elegidas = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: lugares,
      quality: 1,
    });
    if (elegidas.canceled || elegidas.assets.length === 0) return;

    setSubiendo(true);
    let actuales = fotos;
    let problema: string | null =
      elegidas.assets.length > lugares
        ? t("subimosAlgunas", { lugares, total: elegidas.assets.length, max: MAX_FOTOS })
        : null;
    for (const a of elegidas.assets.slice(0, lugares)) {
      const r = await subirUna(a.uri, a.width, a.height, siguienteOrden(actuales));
      if (typeof r === "string") {
        problema = r;
        continue;
      }
      actuales = [...actuales, r];
      onCambio((prev) => {
        if (prev.length >= MAX_FOTOS) return prev;
        // En el alta (sin fila en la base todavía) el orden se recalcula sobre lo que hay.
        return [...prev, { ...r, orden: persistir ? r.orden : siguienteOrden(prev) }];
      });
    }
    setSubiendo(false);
    setError(problema);
  }

  async function eliminar(foto: FotoTalento) {
    await supabase.storage.from(BUCKET_FOTOS).remove([foto.storage_path]);
    if (foto.enBd) await supabase.from("fotos_talento").delete().eq("id", foto.id);
    onCambio((prev) => prev.filter((f) => f.id !== foto.id));
  }

  async function hacerPrincipal(foto: FotoTalento) {
    const reordenadas = reordenarConPrincipal(fotos, foto);
    onCambio(reordenadas);
    await Promise.all(
      reordenadas
        .filter((f) => f.enBd)
        .map((f) => supabase.from("fotos_talento").update({ orden: f.orden }).eq("id", f.id)),
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ordenadas.map((foto, i) => (
          <View key={foto.id} style={{ width: "31%", gap: 4 }}>
            <Image
              source={{ uri: foto.url }}
              accessibilityLabel={t("altFoto")}
              style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: radio.campo }}
              contentFit="cover"
            />
            {i === 0 ? (
              <Texto variante="chico" style={{ fontFamily: fuente.semi, color: color.acento }}>
                {t("principal")}
              </Texto>
            ) : (
              <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={() => hacerPrincipal(foto)}>
                {t("principal")}
              </Texto>
            )}
            <Texto variante="chico" style={{ textDecorationLine: "underline", color: color.error }} onPress={() => eliminar(foto)}>
              {t("eliminar")}
            </Texto>
          </View>
        ))}
        {fotos.length < MAX_FOTOS && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("agregar")}
            onPress={agregar}
            disabled={subiendo}
            style={{
              width: "31%",
              aspectRatio: 4 / 5,
              borderRadius: radio.campo,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: color.borde,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {subiendo ? (
              <ActivityIndicator color={color.texto} />
            ) : (
              <Ionicons name="add" size={26} color={color.textoTenue} />
            )}
            <Texto variante="chico" style={{ textAlign: "center" }}>
              {subiendo ? t("subiendo") : t("agregar")}
            </Texto>
          </Pressable>
        )}
      </View>
      <Texto variante="chico">{t("contador", { n: fotos.length, max: MAX_FOTOS })}</Texto>
      {error && <Texto variante="error">{error}</Texto>}
    </View>
  );
}
