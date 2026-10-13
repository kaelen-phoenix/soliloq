import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import { claveRolEnSala } from "@/lib/salas-reglas";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { EspacioDiscord } from "~/ui/salas/espacio-discord";
import { SalaChat, type Integrante, type Mensaje } from "~/ui/salas/sala-chat";
import { Texto } from "~/ui/texto";
import { fuente, useColores } from "~/ui/tema";

type Iniciativa = { titulo: string; creador_id: string };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (!v ? null : Array.isArray(v) ? (v[0] ?? null) : v);

interface Datos {
  tipo: "proyecto" | "equipo" | "directo";
  titulo: string;
  esDueno: boolean;
  esDeIniciativa: boolean;
  mensajes: Mensaje[];
  integrantes: Integrante[];
}

/** Un chat (`/salas/[id]` de la web). */
export default function Sala() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations("chats.paginas");
  const tComun = useTranslations("comun");
  const tNoEncontrado = useTranslations("cuenta.noEncontrado");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [datos, setDatos] = useState<Datos | null | undefined>(undefined);

  useEffect(() => {
    if (!userId || !id) return;
    (async () => {
      const { data: sala } = await supabase
        .from("salas")
        .select("id, obra_id, equipo_id, titulo, obras(titulo, creador_id), equipos(titulo, creador_id)")
        .eq("id", id)
        .maybeSingle();
      if (!sala) return setDatos(null);
      // La obra/equipo puede venir vacío aunque la sala exista (bloqueo del creador, 0022).
      const obra = uno(sala.obras as Iniciativa | Iniciativa[] | null);
      const equipo = uno(sala.equipos as Iniciativa | Iniciativa[] | null);
      const esDeIniciativa = !!(sala.obra_id || sala.equipo_id);

      const [{ data: mensajes }, { data: integrantesRaw }] = await Promise.all([
        supabase.from("mensajes").select("*").eq("sala_id", id).order("creado_en"),
        supabase.from("sala_integrantes").select("perfil_id").eq("sala_id", id),
      ]);
      const ids = (integrantesRaw ?? []).map((i) => i.perfil_id);
      // La identidad de cualquier integrante, también del Creador, sale de su Perfil de Talento (#175).
      const { data: talentos } = await supabase
        .from("perfiles_talento")
        .select("id, nombre, fotos_talento(storage_path, orden)")
        .in("id", ids);
      const integrantes: Integrante[] = ids.map((pid) => {
        const talento = talentos?.find((x) => x.id === pid);
        const foto = talento?.fotos_talento?.find((f) => f.orden === 0);
        const esDirector = obra?.creador_id === pid || equipo?.creador_id === pid;
        return {
          perfil_id: pid,
          nombre: talento?.nombre ?? (esDeIniciativa ? t("integrante") : t("perfilSinCompletar")),
          foto_url: foto ? supabase.storage.from("fotos-perfil").getPublicUrl(foto.storage_path).data.publicUrl : null,
          rol_en_obra: t(claveRolEnSala(esDirector, esDeIniciativa)),
          esTalento: !!talento,
        };
      });
      setDatos({
        tipo: sala.obra_id ? "proyecto" : sala.equipo_id ? "equipo" : "directo",
        titulo:
          obra?.titulo ??
          equipo?.titulo ??
          (!esDeIniciativa
            ? integrantes.filter((i) => i.perfil_id !== userId).map((i) => i.nombre).join(t("separadorNombres")) ||
              sala.titulo
            : sala.titulo) ??
          t("proyecto"),
        esDueno: obra?.creador_id === userId || equipo?.creador_id === userId,
        esDeIniciativa,
        mensajes: mensajes ?? [],
        integrantes,
      });
    })();
  }, [id, userId, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.superficie }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: color.borde, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tComun("volver")} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={color.textoTenue} />
        </Pressable>
        {datos && (
          <View style={{ flex: 1 }}>
            <Texto variante="chico" style={{ fontFamily: fuente.media, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {datos.tipo === "proyecto" ? t("salaDeProyecto") : datos.tipo === "equipo" ? t("salaDeEquipo") : t("chatDirecto")}
            </Texto>
            <Texto numberOfLines={1} accessibilityRole="header" style={{ fontFamily: fuente.semi }}>
              {datos.titulo}
            </Texto>
          </View>
        )}
        {/* Espacio privado en Discord (#269), solo en Proyectos y Equipos. */}
        {datos && datos.tipo !== "directo" && userId && id && (
          <EspacioDiscord salaId={id} esDueno={datos.esDueno} userId={userId} />
        )}
      </View>
      {datos === undefined || !userId || !id ? (
        <ActivityIndicator color={color.texto} style={{ marginTop: 40 }} />
      ) : datos === null ? (
        <View style={{ alignItems: "center", gap: 6, marginTop: 40, paddingHorizontal: 24 }}>
          <Texto variante="subtitulo">{tNoEncontrado("titulo")}</Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>
            {tNoEncontrado("detalle")}
          </Texto>
        </View>
      ) : (
        <SalaChat
          salaId={id}
          userId={userId}
          mensajesIniciales={datos.mensajes}
          integrantes={datos.integrantes}
          esDueno={datos.esDeIniciativa && datos.esDueno}
        />
      )}
    </SafeAreaView>
  );
}
