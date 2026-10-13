import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { useTranslations } from "use-intl";
import {
  armarConvocatorias,
  obrasConMatches,
  pestanaInicial,
  rolesDeCobertura,
  type FilaConvocado,
  type FilaMatchTalento,
  type MatchNuevo,
  type RolDisponible,
} from "@/lib/matches";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Pantalla } from "~/ui/pantalla";
import { ConvocadosLista } from "~/ui/talento/convocados-lista";
import { marcarConvocatoriasVistas } from "~/ui/talento/convocatorias-nuevas";
import { iniciativaActiva, marcarMatchMostrado, urlFoto } from "~/ui/talento/datos";
import { MisPostulaciones } from "~/ui/talento/mis-postulaciones";
import { PlacaInteres } from "~/ui/talento/placa-interes";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores } from "~/ui/tema";

interface Datos {
  filasCreador: FilaConvocado[];
  filasTalento: FilaMatchTalento[];
  nuevos: MatchNuevo[];
  rolesPorObra: Record<string, RolDisponible[]>;
  tieneIniciativas: boolean;
  inicial: "proyectos" | "talento";
}

/** Lo mismo que lee `/matches` en la web; las filas las arma `@/lib/matches`. */
async function leer(userId: string): Promise<Datos> {
  // #368: el texto inicial de «Mis convocados» depende de si hay algún Proyecto o Equipo propio.
  const [activa, obras, equipos, { data: matches }, { data: convocados }, { data: comoTalento }] = await Promise.all([
    iniciativaActiva(userId),
    supabase.from("obras").select("id", { count: "exact", head: true }).eq("creador_id", userId),
    supabase.from("equipos").select("id", { count: "exact", head: true }).eq("creador_id", userId),
    supabase.rpc("mis_matches"),
    supabase.rpc("mis_convocados"),
    // #298: del otro lado, dónde hizo match quien mira.
    supabase.rpc("mis_matches_como_talento"),
  ]);
  const conteoFallido = !!obras.error || !!equipos.error;
  const tieneIniciativas = conteoFallido || (obras.count ?? 0) + (equipos.count ?? 0) > 0;

  // Roles de cada Proyecto con matches, para elegir a cuál queda asociado al convocar (#152).
  const rolesPorObra: Record<string, RolDisponible[]> = {};
  await Promise.all(
    obrasConMatches(matches, convocados).map(async (obraId) => {
      const { data } = await supabase.rpc("cobertura_iniciativa", { p_obra_id: obraId, p_equipo_id: null });
      rolesPorObra[obraId] = rolesDeCobertura(data);
    }),
  );
  const filas = armarConvocatorias(matches, convocados, comoTalento, urlFoto);
  return {
    ...filas,
    rolesPorObra,
    tieneIniciativas,
    inicial: pestanaInicial(filas.filasCreador.length, filas.filasTalento.length, activa != null),
  };
}

/**
 * Convocatorias (`/matches` de la web, #304): «Mis convocados» (a quién convocar de los
 * Proyectos y Equipos propios) y «Mis postulaciones» (dónde hizo match quien mira). Al entrar
 * aparecen, de a uno, los «Hay interés» pendientes (#194) y se apaga el corazón (#366).
 */
export default function Convocatorias() {
  const t = useTranslations("proyectos.matches");
  const tNuevo = useTranslations("proyectos.nuevoMatch");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [datos, setDatos] = useState<Datos | null>(null);
  const [pestana, setPestana] = useState<"proyectos" | "talento" | null>(null);
  const [cola, setCola] = useState<MatchNuevo[]>([]);
  const [cerrando, setCerrando] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const d = await leer(userId);
    setDatos(d);
    setCola(d.nuevos);
    setPestana((p) => p ?? d.inicial);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      // Entrar a Convocatorias es «verlo»: se apaga el corazón (#366).
      marcarConvocatoriasVistas();
      cargar();
    }, [cargar]),
  );

  async function cerrarAviso() {
    const actual = cola[0];
    if (!actual) return;
    setCerrando(true);
    await marcarMatchMostrado(actual.matchId);
    setCerrando(false);
    setCola((prev) => prev.slice(1));
  }

  if (!datos || !pestana) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.superficie }}>
        <ActivityIndicator color={color.texto} />
      </View>
    );
  }

  const pestanaBoton = (p: "proyectos" | "talento", etiqueta: string, cantidad: number) => (
    <Pressable
      key={p}
      accessibilityRole="tab"
      accessibilityState={{ selected: pestana === p }}
      onPress={() => setPestana(p)}
      style={{ flex: 1, alignItems: "center", borderRadius: radio.pildora, paddingVertical: 9, backgroundColor: pestana === p ? color.accion : "transparent" }}
    >
      <Texto style={{ fontSize: 14, fontFamily: pestana === p ? fuente.semi : fuente.media, color: pestana === p ? color.accionTexto : color.textoTenue }}>
        {etiqueta}
        {cantidad > 0 && ` (${cantidad})`}
      </Texto>
    </Pressable>
  );

  const vacio = (titulo: string, detalle: string) => (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
      <Ionicons name="heart-outline" size={28} color={color.textoTenue} />
      <Texto variante="subtitulo" style={{ textAlign: "center" }}>{titulo}</Texto>
      <Texto variante="tenue" style={{ textAlign: "center" }}>{detalle}</Texto>
    </View>
  );

  const actual = cola[0];

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
      <Texto variante="titulo" accessibilityRole="header">
        {t("pestanas.etiqueta")}
      </Texto>
      <Texto variante="tenue">{t("bajada")}</Texto>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderWidth: 1, borderColor: color.borde, borderRadius: radio.pildora, backgroundColor: color.fondoSutil }}>
        {pestanaBoton("proyectos", t("pestanas.convocados"), datos.filasCreador.length)}
        {pestanaBoton("talento", t("pestanas.postulaciones"), datos.filasTalento.length)}
      </View>

      {pestana === "proyectos"
        ? datos.filasCreador.length > 0
          ? <ConvocadosLista filas={datos.filasCreador} rolesPorObra={datos.rolesPorObra} alCambiar={cargar} />
          : vacio(t("vacioProyectosTitulo"), datos.tieneIniciativas ? t("vacioProyectosConIniciativa") : t("vacioProyectosSinIniciativa"))
        : datos.filasTalento.length > 0
          ? <MisPostulaciones filas={datos.filasTalento} alCambiar={cargar} />
          : vacio(t("vacioTalentoTitulo"), t("vacioTalentoDetalle"))}

      {actual && (
        <PlacaInteres
          visible
          titulo={tNuevo("titulo")}
          textoAceptar={tNuevo("aceptar")}
          persona={{ nombre: actual.nombre, fotoUrl: actual.fotoUrl }}
          iniciativa={{ titulo: actual.iniciativaTitulo, fotoUrl: actual.iniciativaFotoUrl }}
          ocupado={cerrando}
          onAceptar={cerrarAviso}
        />
      )}
    </Pantalla>
  );
}
