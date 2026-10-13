import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslations } from "use-intl";
import type { EquipoFeed, RolFeed } from "@/lib/feed-tipos";
import { Rotulo } from "../basicos";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { Avatar, PlacaPerfil } from "./placa-perfil";

// Los colores fijos de las tarjetas de la web (`tarjeta-rol.tsx`, `tarjeta-equipo.tsx`): el
// panel de escena va siempre en negro, elija el tema que elija quien mira.
export const ESCENA = "#0b0a0c";
const PROYECTO = "#c62703";
const EJEMPLO = "#e62d03";
const CORAL = "#fb6543";

function Distintivo({ texto, fondo, tinta = "#ffffff" }: { texto: string; fondo: string; tinta?: string }) {
  return (
    <View style={{ borderRadius: 6, backgroundColor: fondo, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontFamily: fuente.semi, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: tinta }}>
        {texto}
      </Text>
    </View>
  );
}

/** La fila del creador y «Detalle», común a las dos tarjetas. */
function PieCreador({
  creadorId,
  nombre,
  imagen,
  expandido,
  onExpandir,
  deshabilitado,
}: {
  creadorId: string;
  nombre: string;
  imagen: string | null;
  expandido: boolean;
  onExpandir: () => void;
  deshabilitado?: boolean;
}) {
  const t = useTranslations("proyectos.tarjeta");
  const color = useColores();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: color.borde,
        }}
      >
        {/* #159: la foto y el nombre abren el perfil del Creador en una placa. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("verPerfil", { nombre })}
          disabled={deshabilitado}
          onPress={() => setPerfilAbierto(true)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Avatar url={imagen} nombre={nombre} />
          <Texto numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>
            {nombre}
          </Texto>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: expandido }}
          onPress={onExpandir}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Texto variante="chico" style={{ fontFamily: fuente.media }}>
            {expandido ? t("menos") : t("detalle")}
          </Texto>
          <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={14} color={color.textoTenue} />
        </Pressable>
      </View>
      {perfilAbierto && <PlacaPerfil talentoId={creadorId} onCerrar={() => setPerfilAbierto(false)} />}
    </>
  );
}

/** Tarjeta de un rol de un Proyecto (`TarjetaRol` de la web). */
export function TarjetaRol({ rol }: { rol: RolFeed }) {
  const t = useTranslations("proyectos.tarjeta");
  const color = useColores();
  const [expandido, setExpandido] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const rango =
    rol.edad_minima && rol.edad_maxima ? t("rangoEdad", { min: rol.edad_minima, max: rol.edad_maxima }) : null;
  const foto = rol.fotos?.[0];

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: color.borde,
        backgroundColor: color.superficie,
      }}
    >
      {/* Zona "escenario": con foto de la obra si tiene (0048), o el panel oscuro si no. */}
      <View style={{ flex: 1, justifyContent: "space-between", padding: 22, backgroundColor: ESCENA }}>
        {foto && (
          <>
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,10,12,0.55)" }]} />
          </>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {/* El distintivo va primero y en color: una convocatoria falsa que se confunde con
              una real es peor que no mostrar nada. */}
          {rol.es_ejemplo ? <Distintivo texto={t("ejemplo")} fondo={EJEMPLO} /> : <Distintivo texto={t("proyecto")} fondo={PROYECTO} />}
          <Distintivo
            texto={rol.rol_tipo === "tecnica" ? t("tecnica") : t("actuacion")}
            fondo="rgba(255,255,255,0.12)"
            tinta="rgba(255,255,255,0.75)"
          />
          <Text style={{ fontFamily: fuente.normal, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {rol.obra_ubicacion_texto}
          </Text>
        </View>
        <View>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fuente.semi, fontSize: 26, lineHeight: 29, letterSpacing: -0.4, color: "#fff" }}
          >
            {rol.obra_titulo}
          </Text>
          <Text style={{ marginTop: 8, fontFamily: fuente.media, fontSize: 18, color: "rgba(255,255,255,0.9)" }}>
            {rol.rol_nombre}
          </Text>
          {rango && (
            <Text style={{ marginTop: 4, fontFamily: fuente.normal, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
              {rango}
            </Text>
          )}
        </View>
      </View>

      <PieCreador
        creadorId={rol.creador_id}
        nombre={rol.creador_nombre}
        imagen={rol.creador_imagen_url}
        expandido={expandido}
        onExpandir={() => setExpandido((v) => !v)}
        // En un ejemplo no hay perfil real que mostrar.
        deshabilitado={rol.es_ejemplo}
      />

      {expandido && (
        <ScrollView style={{ maxHeight: 176 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
          {rol.es_ejemplo && (
            <View style={{ borderRadius: 8, backgroundColor: color.fondoSutil, padding: 10 }}>
              <Texto variante="chico">{t("avisoEjemplo")}</Texto>
            </View>
          )}
          {rol.rol_descripcion && (
            <View style={{ gap: 4 }}>
              <Rotulo>{t("sobreElRol")}</Rotulo>
              <Texto variante="tenue">{rol.rol_descripcion}</Texto>
            </View>
          )}
          {rol.obra_sinopsis && (
            <View style={{ gap: 4 }}>
              <Rotulo>{t("sinopsis")}</Rotulo>
              <Texto variante="tenue">{rol.obra_sinopsis}</Texto>
            </View>
          )}
          {!rol.es_ejemplo && (
            <Texto style={{ fontFamily: fuente.media }} onPress={() => setPerfilAbierto(true)}>
              {t("verPerfil", { nombre: rol.creador_nombre })} →
            </Texto>
          )}
        </ScrollView>
      )}
      {perfilAbierto && <PlacaPerfil talentoId={rol.creador_id} onCerrar={() => setPerfilAbierto(false)} />}
    </View>
  );
}

/** Tarjeta de un Equipo (`TarjetaEquipo` de la web): la foto adelante, con la cara de quien lo arma. */
export function TarjetaEquipo({ equipo }: { equipo: EquipoFeed }) {
  const t = useTranslations("proyectos.tarjeta");
  const color = useColores();
  const [expandido, setExpandido] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: color.borde,
        backgroundColor: color.superficie,
      }}
    >
      <View style={{ flex: 1, backgroundColor: ESCENA }}>
        {equipo.fotos[0] && (
          <Image source={{ uri: equipo.fotos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,10,12,0.35)" }]} />
        <View style={{ position: "absolute", top: 16, left: 16 }}>
          <Distintivo texto={t("armarEquipo")} fondo={CORAL} tinta={ESCENA} />
        </View>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 22 }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fuente.semi, fontSize: 26, lineHeight: 29, letterSpacing: -0.4, color: "#fff" }}
          >
            {equipo.titulo}
          </Text>
          {equipo.cupo != null && (
            <Text style={{ marginTop: 8, fontFamily: fuente.normal, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
              {t("hastaIntegrantes", { cupo: equipo.cupo })}
            </Text>
          )}
        </View>
      </View>

      <PieCreador
        creadorId={equipo.creador_id}
        nombre={equipo.creador_nombre}
        imagen={equipo.creador_imagen_url}
        expandido={expandido}
        onExpandir={() => setExpandido((v) => !v)}
      />

      {expandido && (
        <View style={{ padding: 18, gap: 12 }}>
          {equipo.fotos.length > 1 && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {equipo.fotos.slice(1, 4).map((url) => (
                <Image key={url} source={{ uri: url }} style={{ flex: 1, aspectRatio: 1, borderRadius: 6 }} contentFit="cover" />
              ))}
            </View>
          )}
          <Texto style={{ fontFamily: fuente.media }} onPress={() => setPerfilAbierto(true)}>
            {t("verPerfil", { nombre: equipo.creador_nombre })} →
          </Texto>
        </View>
      )}
      {perfilAbierto && <PlacaPerfil talentoId={equipo.creador_id} onCerrar={() => setPerfilAbierto(false)} />}
    </View>
  );
}
