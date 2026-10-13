import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { useTranslations } from "use-intl";
import { calcularEdad, type Genero } from "@/lib/constantes";
import { resumirVisitas } from "@/lib/enlace-publico";
import { redesDeJson } from "@/lib/redes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { FilaMenu, Rotulo } from "~/ui/basicos";
import { Pantalla } from "~/ui/pantalla";
import { CompartirEnlace } from "~/ui/perfil/compartir-enlace";
import { DetalleTalento, EtiquetasDisciplina, type TalentoDetalle } from "~/ui/perfil/detalle-talento";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores } from "~/ui/tema";

interface Datos {
  talento: TalentoDetalle & { aparece_en_buscador: boolean };
  creador: { disciplinas: DisciplinaArtistica[]; otro_detalle: string | null } | null;
  enlace: { token: string; activo: boolean; alias: string | null };
  visitas: { ultimos30: number; total: number };
}

/** Lo mismo que lee `/perfil` en la web. */
async function leerPerfil(userId: string, conCreador: boolean): Promise<Datos | null> {
  const [{ data: cuenta }, { data: talento }, { data: fotos }, { data: creador }, { data: visitas }] = await Promise.all([
    supabase.from("perfiles").select("enlace_token, enlace_publico_activo, enlace_alias").eq("id", userId).single(),
    // La fila propia entera: por `select` la base ya no da fecha ni ubicación exacta (#255).
    supabase.rpc("mi_perfil_talento").maybeSingle(),
    supabase.from("fotos_talento").select("id, storage_path, orden").eq("talento_id", userId).order("orden"),
    conCreador
      ? supabase.from("perfiles_creador").select("disciplinas, otro_detalle").eq("id", userId).single()
      : Promise.resolve({ data: null }),
    supabase.from("visitas_enlace").select("dia, cantidad").eq("perfil_id", userId),
  ]);
  if (!cuenta || !talento) return null;
  return {
    talento: {
      nombre: talento.nombre,
      edad: talento.fecha_nacimiento ? calcularEdad(talento.fecha_nacimiento) : null,
      edad_visible: talento.edad_visible,
      ubicacion_publica: talento.ubicacion_publica,
      genero: talento.genero as Genero,
      genero_descripcion: talento.genero_descripcion,
      videoreel_url: talento.videoreel_url,
      experiencia: talento.experiencia,
      formacion: talento.formacion,
      habilidades: talento.habilidades ?? [],
      redes: redesDeJson(talento.redes),
      aparece_en_buscador: talento.aparece_en_buscador,
      fotos: (fotos ?? []).map((f) => ({
        id: f.id,
        orden: f.orden,
        url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
      })),
    },
    creador: creador as Datos["creador"],
    enlace: { token: cuenta.enlace_token, activo: cuenta.enlace_publico_activo, alias: cuenta.enlace_alias },
    visitas: resumirVisitas(visitas),
  };
}

export default function Perfil() {
  const t = useTranslations();
  const color = useColores();
  const { sesion, estado, cerrarSesion } = useSesion();
  const [datos, setDatos] = useState<Datos | null | undefined>(undefined);
  const [recargando, setRecargando] = useState(false);
  const userId = sesion?.user.id;

  const cargar = useCallback(async () => {
    if (!userId) return;
    setDatos(await leerPerfil(userId, !!estado?.tienePerfilCreador));
  }, [userId, estado?.tienePerfilCreador]);

  // Al volver a la pestaña (por ejemplo, después de editar) se relee.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (datos === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie }}>
        <ActivityIndicator color={color.texto} />
      </View>
    );
  }

  return (
    <Pantalla
      refreshControl={
        <RefreshControl
          refreshing={recargando}
          tintColor={color.texto}
          onRefresh={async () => {
            setRecargando(true);
            await cargar();
            setRecargando(false);
          }}
        />
      }
    >
      {datos && (
        <>
          {/* «Así te ven los demás» y el botón para editar (`VistaPerfilPropio`). */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: radio.campo,
              backgroundColor: color.fondoSutil,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Texto variante="chico">{t("perfil.vistaPropia.asiTeVen")}</Texto>
              <Texto variante="chico">
                {datos.talento.aparece_en_buscador ? t("perfil.pagina.avisoVisible") : t("perfil.pagina.avisoOculto")}
              </Texto>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/editar-perfil")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: color.borde,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: color.superficie,
              }}
            >
              <Ionicons name="create-outline" size={15} color={color.texto} />
              <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{t("perfil.vistaPropia.editar")}</Texto>
            </Pressable>
          </View>

          <DetalleTalento talento={datos.talento} esPropio />

          {datos.creador && (
            <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 16 }}>
              <Rotulo>{t("perfil.creador.titulo")}</Rotulo>
              <EtiquetasDisciplina disciplinas={datos.creador.disciplinas} otroDetalle={datos.creador.otro_detalle} />
            </View>
          )}

          {/* Con el perfil oculto el enlace no muestra nada (#265): no se ofrece. */}
          {datos.talento.aparece_en_buscador && userId && (
            <CompartirEnlace
              userId={userId}
              nombre={datos.talento.nombre}
              tokenInicial={datos.enlace.token}
              activoInicial={datos.enlace.activo}
              aliasInicial={datos.enlace.alias}
              visitas={datos.visitas}
            />
          )}
        </>
      )}

      <View style={{ borderTopWidth: 1, borderTopColor: color.borde, marginTop: 8 }}>
        <FilaMenu icono="settings-outline" texto={t("perfil.pagina.ajustes")} onPress={() => router.push("/ajustes")} />
        <FilaMenu icono="key-outline" texto={t("perfil.pagina.cambiarClave")} onPress={() => router.push("/cambiar-clave")} />
        <FilaMenu icono="log-out-outline" texto={t("cuenta.cerrarSesion")} onPress={cerrarSesion} peligro />
      </View>
    </Pantalla>
  );
}
