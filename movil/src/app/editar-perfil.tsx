import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import type { Genero } from "@/lib/constantes";
import { BUCKET_FOTOS, type FotoTalento } from "@/lib/perfil-talento";
import { redesDeJson } from "@/lib/redes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { FormularioPerfil, type DatosIniciales } from "~/ui/perfil/formulario-perfil";
import { Texto } from "~/ui/texto";
import { fuente, useColores } from "~/ui/tema";

interface Datos {
  inicial: DatosIniciales;
  fotos: FotoTalento[];
  creador?: { disciplinas: DisciplinaArtistica[]; otro_detalle: string | null };
}

/** Editar el perfil (`/perfil?editar=1` de la web). */
export default function EditarPerfil() {
  const t = useTranslations("perfil.pagina");
  const color = useColores();
  const { sesion, estado, recargar } = useSesion();
  const userId = sesion?.user.id;
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: talento }, { data: fotos }, { data: creador }] = await Promise.all([
        supabase.rpc("mi_perfil_talento").maybeSingle(),
        supabase.from("fotos_talento").select("id, storage_path, orden").eq("talento_id", userId).order("orden"),
        estado?.tienePerfilCreador
          ? supabase.from("perfiles_creador").select("disciplinas, otro_detalle").eq("id", userId).single()
          : Promise.resolve({ data: null }),
      ]);
      if (!talento) return;
      setDatos({
        inicial: { ...talento, genero: talento.genero as Genero, redes: redesDeJson(talento.redes), habilidades: talento.habilidades ?? [] },
        fotos: (fotos ?? []).map((f) => ({
          id: f.id,
          storage_path: f.storage_path,
          orden: f.orden,
          url: supabase.storage.from(BUCKET_FOTOS).getPublicUrl(f.storage_path).data.publicUrl,
          enBd: true,
        })),
        creador: (creador as Datos["creador"]) ?? undefined,
      });
    })();
  }, [userId, estado?.tienePerfilCreador]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.superficie }} edges={["top", "left", "right"]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12 }}
      >
        <Ionicons name="chevron-back" size={18} color={color.textoTenue} />
        <Texto variante="tenue" style={{ fontFamily: fuente.media }}>
          {t("verMiPerfil")}
        </Texto>
      </Pressable>
      {!datos || !userId ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.texto} />
        </View>
      ) : (
        <FormularioPerfil
          userId={userId}
          esAlta={false}
          datosIniciales={datos.inicial}
          fotosIniciales={datos.fotos}
          datosCreador={datos.creador}
          // Si se ocultó o mostró, la navegación y el perfil lo leen de nuevo.
          alTerminar={recargar}
        />
      )}
    </SafeAreaView>
  );
}
