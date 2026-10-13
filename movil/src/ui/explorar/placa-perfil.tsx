import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import { COLUMNAS_PUBLICAS_TALENTO, type Genero } from "@/lib/constantes";
import { redesDeJson } from "@/lib/redes";
import { supabase } from "~/lib/supabase";
import { Boton } from "../boton";
import { DetalleTalento, type TalentoDetalle } from "../perfil/detalle-talento";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/**
 * Como `PlacaPerfilTalento` de la web (#159): el perfil del Creador en una hoja que sube desde
 * abajo, sin sacar al Talento de la tarjeta. Solo lo público: RLS resuelve el acceso.
 */
export function PlacaPerfil({ talentoId, onCerrar }: { talentoId: string; onCerrar: () => void }) {
  const t = useTranslations("perfil.placa");
  const tComun = useTranslations("comun");
  const color = useColores();
  const insets = useSafeAreaInsets();
  const [talento, setTalento] = useState<TalentoDetalle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      // La fecha y la ubicación exacta no salen de la base (#255).
      const [{ data: perfil }, { data: fotos }, { data: edad }] = await Promise.all([
        supabase.from("perfiles_talento").select(COLUMNAS_PUBLICAS_TALENTO).eq("id", talentoId).single(),
        supabase.from("fotos_talento").select("id, storage_path, orden").eq("talento_id", talentoId).order("orden"),
        supabase.rpc("edad_publica", { p_perfil: talentoId }),
      ]);
      if (cancelado) return;
      if (!perfil) return setError(true);
      setTalento({
        nombre: perfil.nombre,
        edad: edad ?? null,
        edad_visible: perfil.edad_visible,
        ubicacion_publica: perfil.ubicacion_publica,
        genero: perfil.genero as Genero,
        genero_descripcion: perfil.genero_descripcion,
        videoreel_url: perfil.videoreel_url,
        experiencia: perfil.experiencia,
        formacion: perfil.formacion,
        habilidades: perfil.habilidades ?? [],
        redes: redesDeJson(perfil.redes),
        fotos: (fotos ?? []).map((f) => ({
          id: f.id,
          orden: f.orden,
          url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
        })),
      });
    })();
    return () => {
      cancelado = true;
    };
  }, [talentoId]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable
        accessibilityLabel={t("cerrar")}
        onPress={onCerrar}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={t("etiqueta")}
          onPress={() => {}}
          style={{
            maxHeight: "88%",
            backgroundColor: color.superficie,
            borderTopLeftRadius: radio.tarjeta + 4,
            borderTopRightRadius: radio.tarjeta + 4,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {error ? (
              <Texto variante="tenue" style={{ textAlign: "center", paddingVertical: 24 }}>
                {t("error")}
              </Texto>
            ) : !talento ? (
              <Texto variante="tenue" style={{ textAlign: "center", paddingVertical: 24 }}>
                {tComun("cargando")}
              </Texto>
            ) : (
              <DetalleTalento talento={talento} />
            )}
          </ScrollView>
          <View style={{ paddingHorizontal: 20 }}>
            <Boton onPress={onCerrar}>{t("cerrar")}</Boton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** La foto redonda de una persona, o su inicial si no tiene. */
export function Avatar({ url, nombre, lado = 28 }: { url: string | null; nombre: string; lado?: number }) {
  const color = useColores();
  if (url) {
    return <Image source={{ uri: url }} style={{ width: lado, height: lado, borderRadius: lado / 2 }} contentFit="cover" />;
  }
  return (
    <View
      style={{
        width: lado,
        height: lado,
        borderRadius: lado / 2,
        backgroundColor: color.ink100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fuente.semi, fontSize: lado * 0.4, color: color.textoTenue }}>{nombre[0] ?? "·"}</Text>
    </View>
  );
}
