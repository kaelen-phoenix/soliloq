import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import { fotoDeGoogle, nombreDeGoogle } from "@/lib/foto-google";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Marca } from "../marca";
import { Texto } from "../texto";
import { useColores } from "../tema";
import { FormularioPerfil } from "./formulario-perfil";

/** El alta del perfil (`/completar-perfil` de la web): el asistente por pasos (#383). */
export function AltaPerfil() {
  const t = useTranslations("perfil.completar");
  const color = useColores();
  const { sesion, recargar } = useSesion();
  const user = sesion?.user;
  const [borrador, setBorrador] = useState<{ paso: number; datos: unknown; actualizadoEn: string } | null | undefined>(
    undefined,
  );

  // #383: si ya había empezado (en este u otro dispositivo), sigue donde quedó.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("borradores_perfil")
      .select("paso, datos, actualizado_en")
      .eq("perfil_id", user.id)
      .maybeSingle()
      .then(({ data }) => setBorrador(data ? { paso: data.paso, datos: data.datos, actualizadoEn: data.actualizado_en } : null));
  }, [user]);

  if (!user || borrador === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie }}>
        <ActivityIndicator color={color.texto} />
      </View>
    );
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.superficie }} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}>
        <Marca />
        <Texto variante="subtitulo">{t("titulo")}</Texto>
        <Texto variante="chico">{t("bajada")}</Texto>
      </View>
      <FormularioPerfil
        userId={user.id}
        esAlta
        fotosIniciales={[]}
        nombreSugerido={nombreDeGoogle(meta)}
        conFotoGoogle={fotoDeGoogle(meta) != null}
        borrador={borrador}
        // Con el perfil creado, la navegación pasa sola a la app.
        alTerminar={recargar}
      />
    </SafeAreaView>
  );
}
