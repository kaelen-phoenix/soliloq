import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { useTranslations } from "use-intl";
import type { ItemTablero } from "@/lib/iniciativa-reglas";
import { useSesion } from "~/lib/sesion";
import { Tarjeta } from "~/ui/basicos";
import { Boton } from "~/ui/boton";
import { leerTablero } from "~/ui/iniciativas/datos";
import { EstadoVacio, EtiquetaEstado, EtiquetaTipo } from "~/ui/iniciativas/piezas";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores } from "~/ui/tema";

/**
 * Iniciativas (#380, `/proyectos` de la web): un solo «Crear» que pregunta si es un proyecto con
 * roles o un equipo (#341), y una sola lista con todo lo armado, cada cosa con su etiqueta y su
 * estado. Desde #330 no hay límites.
 */
export default function Iniciativas() {
  const t = useTranslations("proyectos.tablero");
  const tCrear = useTranslations("proyectos.crearProyecto");
  const tTitulos = useTranslations("titulos");
  const tc = useTranslations("comun");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [items, setItems] = useState<ItemTablero[] | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (userId) setItems(await leerTablero(userId));
  }, [userId]);

  // Al volver de crear, editar o borrar, la lista se relee.
  useFocusEffect(
    useCallback(() => {
      cargar();
      setEligiendo(false);
    }, [cargar]),
  );

  const opcion = (
    destino: Href,
    titulo: string,
    texto: string,
    icono: React.ComponentProps<typeof Ionicons>["name"],
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(destino)}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        borderWidth: 1,
        borderColor: color.borde,
        borderRadius: radio.campo,
        backgroundColor: color.superficie,
        padding: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icono} size={20} color={color.textoTenue} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto style={{ fontFamily: fuente.media }}>{titulo}</Texto>
        <Texto variante="tenue">{texto}</Texto>
      </View>
    </Pressable>
  );

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
        {tTitulos("misProyectosYEquipos")}
      </Texto>

      {eligiendo ? (
        <Tarjeta style={{ backgroundColor: color.fondoSutil }}>
          <Texto variante="subtitulo">{tCrear("pregunta")}</Texto>
          {/* #414: primero el Equipo, después el Proyecto. */}
          {opcion("/iniciativa/nuevo-equipo" as Href, tCrear("equipoTitulo"), tCrear("equipoTexto"), "heart-outline")}
          {opcion("/iniciativa/nuevo-proyecto" as Href, tCrear("proyectoTitulo"), tCrear("proyectoTexto"), "albums-outline")}
          <Boton variante="fantasma" onPress={() => setEligiendo(false)}>
            {tc("cancelar")}
          </Boton>
        </Tarjeta>
      ) : (
        <Boton onPress={() => setEligiendo(true)}>{`+ ${tCrear("crear")}`}</Boton>
      )}

      {items === null ? (
        <ActivityIndicator color={color.texto} />
      ) : items.length === 0 ? (
        <EstadoVacio titulo={t("vacioTitulo")} detalle={t("vacioDetalle")} />
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((it) => (
            <Pressable
              key={`${it.tipo}-${it.id}`}
              accessibilityRole="link"
              onPress={() => router.push((it.tipo === "proyecto" ? `/obras/${it.id}` : `/equipos/${it.id}`) as Href)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: color.borde,
                borderRadius: radio.campo,
                padding: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Texto style={{ fontFamily: fuente.media }} numberOfLines={1}>
                  {it.titulo}
                </Texto>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <EtiquetaTipo tipo={it.tipo} texto={it.tipo === "equipo" ? t("equipo") : t("proyecto")} />
                  <EtiquetaEstado estado={it.estado} texto={t(`estado.${it.estado}`)} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.textoTenue} />
            </Pressable>
          ))}
        </View>
      )}
    </Pantalla>
  );
}
