import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslations } from "use-intl";
import { COLUMNAS_PUBLICAS_TALENTO, type Genero } from "@/lib/constantes";
import { redesDeJson } from "@/lib/redes";
import { supabase } from "~/lib/supabase";
import { Boton } from "~/ui/boton";
import { Denuncia } from "~/ui/denuncia";
import { Pantalla } from "~/ui/pantalla";
import { DetalleTalento, type TalentoDetalle } from "~/ui/perfil/detalle-talento";
import { urlFoto } from "~/ui/talento/datos";
import { Texto } from "~/ui/texto";
import { useColores } from "~/ui/tema";

/**
 * El perfil de un talento (`/talentos/[id]` de la web): solo visualización —el interés se marca
 * desde la pila (#124)— y la denuncia. Solo lo público: la fecha y la ubicación exacta no salen
 * de la base (#255). RLS resuelve si quien mira puede verlo.
 */
export default function PerfilDeTalento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations("proyectos.talentos");
  const tc = useTranslations("comun");
  const tPlaca = useTranslations("perfil.placa");
  const color = useColores();
  const [talento, setTalento] = useState<(TalentoDetalle & { id: string }) | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    (async () => {
      const [{ data: perfil }, { data: fotos }, { data: edad }] = await Promise.all([
        supabase.from("perfiles_talento").select(COLUMNAS_PUBLICAS_TALENTO).eq("id", id).single(),
        supabase.from("fotos_talento").select("id, storage_path, orden").eq("talento_id", id).order("orden"),
        supabase.rpc("edad_publica", { p_perfil: id }),
      ]);
      if (!vigente) return;
      if (!perfil) return setTalento(null);
      setTalento({
        id: perfil.id,
        nombre: perfil.nombre,
        edad_visible: perfil.edad_visible,
        ubicacion_publica: perfil.ubicacion_publica,
        genero: perfil.genero as Genero,
        genero_descripcion: perfil.genero_descripcion,
        videoreel_url: perfil.videoreel_url,
        experiencia: perfil.experiencia,
        formacion: perfil.formacion,
        habilidades: perfil.habilidades ?? [],
        redes: redesDeJson(perfil.redes),
        // `edad_publica` ya devuelve null si la ocultó (#110).
        edad: (edad as number | null) ?? null,
        fotos: (fotos ?? []).map((f) => ({ id: f.id, orden: f.orden, url: urlFoto(f.storage_path) ?? "" })),
      });
    })();
    return () => {
      vigente = false;
    };
  }, [id]);

  return (
    <Pantalla>
      <Boton variante="fantasma" onPress={() => router.back()}>
        {tc("volver")}
      </Boton>
      {talento === undefined ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={color.texto} />
        </View>
      ) : talento === null ? (
        <Texto variante="tenue">{tPlaca("error")}</Texto>
      ) : (
        <>
          <DetalleTalento talento={talento} />
          <View style={{ marginTop: 16 }}>
            <Denuncia perfilDenunciadoId={talento.id} queSeDenuncia={t("denunciarA", { nombre: talento.nombre })} />
          </View>
        </>
      )}
    </Pantalla>
  );
}
