import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { MAX_FOTOS_INICIATIVA, MIN_FOTOS_INICIATIVA, rutaFotoIniciativa } from "@/lib/iniciativa-reglas";
import { BUCKET_FOTOS } from "@/lib/perfil-talento";
import { supabase } from "~/lib/supabase";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { comprimirFoto } from "~/ui/comprimir-foto";

export interface FotoIniciativa {
  id: string;
  storage_path: string;
  orden: number;
  url: string;
}

/**
 * Las fotos de un Proyecto o Equipo (`FotosObra` / `FotosEquipo` de la web). La iniciativa ya
 * existe, así que cada foto se guarda al toque. Avisa con `onSubiendo` mientras sube: publicar
 * espera (#349).
 */
export function FotosIniciativa({
  tipo,
  iniciativaId,
  creadorId,
  fotos,
  onCambio,
  onSubiendo,
}: {
  tipo: "obra" | "equipo";
  iniciativaId: string;
  creadorId: string;
  fotos: FotoIniciativa[];
  onCambio: (f: FotoIniciativa[] | ((prev: FotoIniciativa[]) => FotoIniciativa[])) => void;
  onSubiendo?: (subiendo: boolean) => void;
}) {
  const t = useTranslations("proyectos.fotos");
  const color = useColores();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);
  const faltan = Math.max(0, MIN_FOTOS_INICIATIVA - fotos.length);
  const tabla = tipo === "obra" ? "fotos_obra" : "fotos_equipo";

  function marcarSubiendo(v: boolean) {
    setSubiendo(v);
    onSubiendo?.(v);
  }

  async function agregar() {
    setError(null);
    const lugares = MAX_FOTOS_INICIATIVA - fotos.length;
    if (lugares <= 0) return setError(t("maximo", { max: MAX_FOTOS_INICIATIVA }));
    const elegidas = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: lugares,
      quality: 1,
    });
    if (elegidas.canceled || elegidas.assets.length === 0) return;

    marcarSubiendo(true);
    let actuales = fotos;
    let problema: string | null = elegidas.assets.length > lugares ? t("maximo", { max: MAX_FOTOS_INICIATIVA }) : null;
    for (const a of elegidas.assets.slice(0, lugares)) {
      const foto = await comprimirFoto(a.uri, a.width, a.height);
      if (!foto) {
        problema = t("procesar");
        continue;
      }
      const ruta = rutaFotoIniciativa(creadorId, tipo, iniciativaId, `${Crypto.randomUUID()}.jpg`);
      const { error: errorSubida } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(ruta, foto, { contentType: "image/jpeg" });
      if (errorSubida) {
        problema = t("subir");
        continue;
      }
      const orden = actuales.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
      const fila =
        tipo === "obra"
          ? await supabase.from("fotos_obra").insert({ obra_id: iniciativaId, storage_path: ruta, orden }).select("id").single()
          : await supabase.from("fotos_equipo").insert({ equipo_id: iniciativaId, storage_path: ruta, orden }).select("id").single();
      if (fila.error || !fila.data) {
        await supabase.storage.from(BUCKET_FOTOS).remove([ruta]);
        problema = t("guardar");
        continue;
      }
      const nueva = {
        id: fila.data.id,
        storage_path: ruta,
        orden,
        url: supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl,
      };
      actuales = [...actuales, nueva];
      onCambio((prev) => [...prev, nueva]);
    }
    marcarSubiendo(false);
    setError(problema);
  }

  async function eliminar(foto: FotoIniciativa) {
    await supabase.storage.from(BUCKET_FOTOS).remove([foto.storage_path]);
    await supabase.from(tabla).delete().eq("id", foto.id);
    onCambio((prev) => prev.filter((f) => f.id !== foto.id));
  }

  return (
    <View style={{ gap: 8 }}>
      <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>
        {tipo === "obra" ? t("tituloObra") : t("tituloEquipo")}
      </Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ordenadas.map((foto, i) => (
          <View key={foto.id} style={{ width: "31%", gap: 4 }}>
            <Image
              source={{ uri: foto.url }}
              accessibilityLabel={tipo === "obra" ? t("altObra") : t("altEquipo")}
              style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: radio.campo }}
              contentFit="cover"
            />
            {i === 0 && (
              <Texto variante="chico" style={{ fontFamily: fuente.semi, color: color.acento }}>
                {t("principal")}
              </Texto>
            )}
            <Texto
              variante="chico"
              accessibilityRole="button"
              style={{ textDecorationLine: "underline", color: color.error }}
              onPress={() => eliminar(foto)}
            >
              {t("eliminar")}
            </Texto>
          </View>
        ))}
        {fotos.length < MAX_FOTOS_INICIATIVA && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("agregar")}
            onPress={agregar}
            disabled={subiendo}
            style={{
              width: "31%",
              aspectRatio: 3 / 4,
              borderRadius: radio.campo,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: color.borde,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {subiendo ? <ActivityIndicator color={color.texto} /> : <Ionicons name="add" size={24} color={color.textoTenue} />}
            <Texto variante="chico">{subiendo ? t("subiendo") : t("agregar")}</Texto>
          </Pressable>
        )}
      </View>
      {error && <Texto variante="error">{error}</Texto>}
      <Texto variante="chico">
        {tipo === "obra"
          ? faltan > 0
            ? t("pieObraFaltan", { minimo: MIN_FOTOS_INICIATIVA, max: MAX_FOTOS_INICIATIVA })
            : t("pieObra", { n: fotos.length, max: MAX_FOTOS_INICIATIVA })
          : faltan > 0
            ? t("pieEquipoFaltan", { n: fotos.length, max: MAX_FOTOS_INICIATIVA, faltan, minimo: MIN_FOTOS_INICIATIVA })
            : t("pieEquipo", { n: fotos.length, max: MAX_FOTOS_INICIATIVA })}
      </Texto>
    </View>
  );
}
