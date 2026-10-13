import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslations } from "use-intl";
import { claveErrorDeshacer, claveErrorInteres } from "@/lib/feed-errores";
import { aRolFeed } from "@/lib/feed-roles";
import { UMBRAL_SWIPE, type Decision, type EquipoFeed, type ItemFeed, type RolFeed } from "@/lib/feed-tipos";
import { rolesEjemplo } from "@/lib/onboarding-ejemplo";
import { opcionesDeRadio, radioMasCercano, type UnidadDistancia } from "@/lib/ubicacion";
import { supabase } from "~/lib/supabase";
import { Texto } from "../texto";
import { fuente, radio as radios, useColores } from "../tema";
import { TarjetaEquipo, TarjetaRol } from "./tarjetas";

const urlPublica = (p: string) => supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;

/** El selector de distancia (el `<select>` de la web), como una lista que sube desde abajo. */
function SelectorDistancia({
  opciones,
  actual,
  deshabilitado,
  onElegir,
}: {
  opciones: { etiqueta: string; metros: number | null }[];
  actual: { etiqueta: string; metros: number | null };
  deshabilitado: boolean;
  onElegir: (metros: number | null) => void;
}) {
  const t = useTranslations("proyectos.pila");
  const color = useColores();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("distancia")}: ${actual.etiqueta}`}
        disabled={deshabilitado}
        onPress={() => setAbierto(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderWidth: 1,
          borderColor: color.borde,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 5,
          opacity: deshabilitado ? 0.5 : 1,
        }}
      >
        <Text style={{ fontFamily: fuente.media, fontSize: 12, color: color.texto }}>{actual.etiqueta}</Text>
        <Ionicons name="chevron-down" size={12} color={color.textoTenue} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable
          onPress={() => setAbierto(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 32 }}
        >
          <View style={{ backgroundColor: color.superficie, borderRadius: radios.tarjeta, paddingVertical: 8 }}>
            <Texto variante="chico" style={{ paddingHorizontal: 18, paddingVertical: 8 }}>
              {t("distancia")}
            </Texto>
            {opciones.map((o) => {
              const elegida = o.metros === actual.metros;
              return (
                <Pressable
                  key={o.etiqueta}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegida }}
                  onPress={() => {
                    setAbierto(false);
                    if (!elegida) onElegir(o.metros);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 18,
                    paddingVertical: 13,
                    backgroundColor: pressed ? color.fondoSutil : "transparent",
                  })}
                >
                  <Texto style={{ fontFamily: elegida ? fuente.semi : fuente.normal }}>{o.etiqueta}</Texto>
                  {elegida && <Ionicons name="checkmark" size={18} color={color.acento} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * La pila de Explorar (`PilaTarjetas` de la web): roles de Proyectos y Equipos, de a uno. Se
 * desliza a la derecha («Me interesa») o a la izquierda («Paso»), o con los botones de abajo.
 * Las reglas son las de la web: el filtro de distancia lo resuelve Postgres, los ejemplos del
 * onboarding no escriben nada, los equipos no entran en «Deshacer».
 */
export function PilaTarjetas({
  talentoId,
  radioInicialMetros,
  unidadInicial,
  rolesIniciales,
  equiposIniciales,
  mostrarEjemplos,
}: {
  talentoId: string;
  radioInicialMetros: number | null;
  unidadInicial: UnidadDistancia;
  rolesIniciales: RolFeed[];
  equiposIniciales: EquipoFeed[];
  /** Primera vez de esta cuenta: van las tarjetas de ejemplo antes que las reales. */
  mostrarEjemplos: boolean;
}) {
  const t = useTranslations("proyectos.pila");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const color = useColores();
  const { width, height } = useWindowDimensions();
  // Los ejemplos van aparte de `roles`: `recargar` reemplaza el feed al cambiar la distancia.
  const [ejemplos, setEjemplos] = useState<RolFeed[]>(() => (mostrarEjemplos ? rolesEjemplo(tEtiquetas) : []));
  const [roles, setRoles] = useState(rolesIniciales);
  const [equipos, setEquipos] = useState(equiposIniciales);
  const [indice, setIndice] = useState(0);
  const [radio, setRadio] = useState<number | null>(radioInicialMetros);
  const [unidad, setUnidad] = useState<UnidadDistancia>(unidadInicial);
  const [recargando, setRecargando] = useState(false);
  const [hayFueraDelRadio, setHayFueraDelRadio] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  // Últimas decisiones reales, para «Deshacer». Los ejemplos no entran acá.
  const [historial, setHistorial] = useState<{ rol: RolFeed; decision: Decision }[]>([]);
  const [reducirMovimiento, setReducirMovimiento] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducirMovimiento).catch(() => {});
  }, []);

  const pila = useMemo<ItemFeed[]>(
    () => [
      ...ejemplos.map((r) => ({ kind: "rol" as const, data: r })),
      ...roles.slice(indice).map((r) => ({ kind: "rol" as const, data: r })),
      ...equipos.map((e) => ({ kind: "equipo" as const, data: e })),
    ],
    [ejemplos, roles, indice, equipos],
  );
  const actual = pila[0];
  const siguiente = pila[1];

  const opciones = opcionesDeRadio(unidad, tEtiquetas);
  const opcionActual = radioMasCercano(radio, unidad, tEtiquetas);

  // La posición de la tarjeta de arriba: de acá cuelgan el giro y los sellos.
  const x = useRef(new Animated.Value(0)).current;
  const giro = x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: reducirMovimiento ? ["0deg", "0deg", "0deg"] : ["-14deg", "0deg", "14deg"],
  });
  const opacidadSi = x.interpolate({ inputRange: [30, 130], outputRange: [0, 1], extrapolate: "clamp" });
  const opacidadNo = x.interpolate({ inputRange: [-130, -30], outputRange: [1, 0], extrapolate: "clamp" });

  /** Cambiar el radio es volver a pedir el feed, no filtrar lo que ya está en memoria. */
  async function recargar(nuevoRadio: number | null, nuevaUnidad: UnidadDistancia) {
    setRecargando(true);
    setAvisoError(null);
    await supabase
      .from("perfiles_talento")
      .update({ radio_busqueda_metros: nuevoRadio, unidad_distancia: nuevaUnidad })
      .eq("id", talentoId);
    const { data, error } = await supabase.rpc("feed_para_talento", {
      p_talento_id: talentoId,
      p_radio_metros: nuevoRadio,
    });
    if (error) {
      setRecargando(false);
      setAvisoError(t("errorActualizar"));
      return;
    }
    const nuevos = (data ?? []).map((r) => aRolFeed(r, urlPublica));
    setRoles(nuevos);
    setIndice(0);
    setHistorial([]);
    // La consulta de más se paga solo en el caso vacío, el único donde hay algo que explicar.
    if (nuevos.length === 0 && nuevoRadio !== null) {
      const { data: sinRadio } = await supabase.rpc("feed_para_talento", {
        p_talento_id: talentoId,
        p_radio_metros: null,
      });
      setHayFueraDelRadio((sinRadio ?? []).length > 0);
    } else {
      setHayFueraDelRadio(false);
    }
    setRecargando(false);
  }

  function cambiarRadio(metros: number | null) {
    setRadio(metros);
    recargar(metros, unidad);
  }

  function cambiarUnidad(nueva: UnidadDistancia) {
    // El radio en metros no se convierte: cambia cómo se lee, no qué se busca.
    setUnidad(nueva);
    recargar(radio, nueva);
  }

  async function registrarDecision(rol: RolFeed, decision: Decision) {
    // «Me interesa» / «Paso» hacia el proyecto (circuito de match, #117).
    const { error } = await supabase.rpc("marcar_interes", {
      p_a_perfil: rol.creador_id,
      p_obra_id: rol.obra_id,
      p_equipo_id: null,
      p_interesa: decision === "postular",
    });
    if (error) {
      setAvisoError(t(claveErrorInteres(error.message)));
      setRoles((prev) => [rol, ...prev]);
      setHistorial((prev) => prev.filter((h) => h.rol.rol_id !== rol.rol_id));
    }
  }

  async function registrarInteresEquipo(equipo: EquipoFeed, decision: Decision) {
    const { error } = await supabase.rpc("marcar_interes", {
      p_a_perfil: equipo.creador_id,
      p_obra_id: null,
      p_equipo_id: equipo.equipo_id,
      p_interesa: decision === "postular",
    });
    if (error) {
      setAvisoError(t(claveErrorInteres(error.message)));
      setEquipos((prev) => [equipo, ...prev]);
    }
  }

  /** Cierra el onboarding al despachar la última tarjeta de ejemplo (un fallo no se muestra). */
  async function marcarOnboardingVisto() {
    await supabase.from("perfiles_talento").update({ onboarding_visto_en: new Date().toISOString() }).eq("id", talentoId);
  }

  function avanzar(item: ItemFeed, decision: Decision) {
    setAvisoError(null);
    x.setValue(0);
    Vibration.vibrate(12);
    if (item.kind === "equipo") {
      setEquipos((prev) => prev.filter((e) => e.equipo_id !== item.data.equipo_id));
      registrarInteresEquipo(item.data, decision);
      return;
    }
    const rol = item.data;
    // Un ejemplo no se guarda en ningún lado: es parte del tutorial.
    if (rol.es_ejemplo) {
      const quedan = ejemplos.filter((e) => e.rol_id !== rol.rol_id);
      setEjemplos(quedan);
      if (quedan.length === 0) marcarOnboardingVisto();
      return;
    }
    setIndice((i) => i + 1);
    setHistorial((prev) => [...prev, { rol, decision }].slice(-10));
    registrarDecision(rol, decision);
  }

  // El gesto y los botones comparten la salida: se guarda la última versión para el PanResponder.
  const salirRef = useRef<(d: Decision) => void>(() => {});
  function salir(decision: Decision) {
    if (!actual || recargando) return;
    if (reducirMovimiento) return avanzar(actual, decision);
    Animated.timing(x, {
      toValue: (decision === "postular" ? 1 : -1) * (width + 100),
      duration: 180,
      useNativeDriver: true,
    }).start(() => avanzar(actual, decision));
  }
  salirRef.current = salir;

  const gesto = useMemo(
    () =>
      PanResponder.create({
        // Solo toma el gesto si es claramente horizontal: el detalle de la tarjeta se desplaza.
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => x.setValue(g.dx),
        // Una vez tomado, el desplazamiento vertical de la pantalla no se lo lleva.
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          if (g.dx > UMBRAL_SWIPE) salirRef.current("postular");
          else if (g.dx < -UMBRAL_SWIPE) salirRef.current("descartar");
          else Animated.spring(x, { toValue: 0, useNativeDriver: true, stiffness: 400, damping: 30 }).start();
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x],
  );

  /** Revierte la última decisión real: la borra de la base y vuelve a poner la tarjeta. */
  async function deshacer() {
    const ultima = historial[historial.length - 1];
    if (!ultima || recargando) return;
    setHistorial((prev) => prev.slice(0, -1));
    setIndice((i) => Math.max(0, i - 1));
    setAvisoError(null);
    x.setValue(0);
    const { error } = await supabase.rpc("deshacer_interes", {
      p_obra_id: ultima.rol.obra_id,
      p_equipo_id: null,
    });
    if (error) {
      setAvisoError(t(claveErrorDeshacer(error.message)));
      setHistorial((prev) => [...prev, ultima]);
      setIndice((i) => i + 1);
    }
  }

  const altoTarjeta = Math.min(500, Math.max(380, height * 0.58));
  const tarjeta = (item: ItemFeed) =>
    item.kind === "rol" ? <TarjetaRol rol={item.data} /> : <TarjetaEquipo equipo={item.data} />;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Texto variante="chico" style={{ fontFamily: fuente.media }}>
          {t("distancia")}
        </Texto>
        <SelectorDistancia opciones={opciones} actual={opcionActual} deshabilitado={recargando} onElegir={cambiarRadio} />
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: color.borde, borderRadius: 8, overflow: "hidden" }}>
          {(["km", "mi"] as const).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="radio"
              accessibilityState={{ selected: unidad === u, disabled: recargando }}
              disabled={recargando}
              onPress={() => cambiarUnidad(u)}
              style={{ paddingHorizontal: 9, paddingVertical: 5, backgroundColor: unidad === u ? color.accion : "transparent" }}
            >
              <Text style={{ fontFamily: fuente.media, fontSize: 12, color: unidad === u ? color.accionTexto : color.textoTenue }}>
                {u}
              </Text>
            </Pressable>
          ))}
        </View>
        {historial.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={deshacer}
            disabled={recargando}
            style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={color.textoTenue} />
            <Texto variante="chico" style={{ fontFamily: fuente.media }}>
              {t("deshacer")}
            </Texto>
          </Pressable>
        )}
      </View>

      {avisoError && <Texto variante="error">{avisoError}</Texto>}

      {/* Solo mientras haya ejemplos arriba de la pila: se lee como algo que termina. */}
      {actual?.kind === "rol" && actual.data.es_ejemplo && (
        <View
          style={{
            borderRadius: radios.campo,
            borderWidth: 1,
            borderColor: "rgba(230,45,3,0.3)",
            backgroundColor: "rgba(230,45,3,0.05)",
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{t("asiFunciona")}</Texto>
          <Texto variante="chico">{t("asiFuncionaTexto", { n: ejemplos.length })}</Texto>
        </View>
      )}

      <View style={{ height: altoTarjeta }}>
        {siguiente && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4, transform: [{ scale: 0.96 }] }}
          >
            {tarjeta(siguiente)}
          </View>
        )}
        {actual ? (
          <Animated.View
            key={actual.kind === "rol" ? actual.data.rol_id : actual.data.equipo_id}
            {...gesto.panHandlers}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateX: x }, { rotate: giro }] }}
          >
            {tarjeta(actual)}
            {/* Sellos que aparecen con el gesto, tipo timbre sobre la tarjeta. */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 20,
                top: 24,
                opacity: opacidadSi,
                transform: [{ rotate: "-12deg" }],
                borderWidth: 2,
                borderColor: "#2f7d4f",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontFamily: fuente.negrita, fontSize: 18, letterSpacing: 0.8, textTransform: "uppercase", color: "#2f7d4f" }}>
                {t("meInteresa")}
              </Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: 20,
                top: 24,
                opacity: opacidadNo,
                transform: [{ rotate: "12deg" }],
                borderWidth: 2,
                borderColor: "#9a9097",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontFamily: fuente.negrita, fontSize: 18, letterSpacing: 0.8, textTransform: "uppercase", color: "#9a9097" }}>
                {t("paso")}
              </Text>
            </Animated.View>
          </Animated.View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: radios.tarjeta,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: color.borde,
              paddingHorizontal: 32,
            }}
          >
            <Ionicons name="albums-outline" size={32} color={color.textoTenue} />
            {hayFueraDelRadio ? (
              <>
                <Texto style={{ fontFamily: fuente.media, textAlign: "center" }}>{t("nadaCercaTitulo")}</Texto>
                <Texto variante="tenue" style={{ textAlign: "center" }}>
                  {t("nadaCercaTexto", { distancia: opcionActual.etiqueta })}
                </Texto>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => cambiarRadio(null)}
                  style={{ marginTop: 8, borderWidth: 1, borderColor: color.texto, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Texto style={{ fontFamily: fuente.media, fontSize: 13 }}>{t("buscarEnTodoElMundo")}</Texto>
                </Pressable>
              </>
            ) : (
              <>
                <Texto style={{ fontFamily: fuente.media, textAlign: "center" }}>{t("vacioTitulo")}</Texto>
                <Texto variante="tenue" style={{ textAlign: "center" }}>
                  {t("vacioTexto")}
                </Texto>
                {historial.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={deshacer}
                    style={{
                      marginTop: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderWidth: 1,
                      borderColor: color.texto,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Ionicons name="arrow-undo-outline" size={14} color={color.texto} />
                    <Texto style={{ fontFamily: fuente.media, fontSize: 13 }}>{t("deshacerUltima")}</Texto>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {actual && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("descartar")}
            onPress={() => salir("descartar")}
            disabled={recargando}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: color.borde,
              backgroundColor: color.superficie,
              alignItems: "center",
              justifyContent: "center",
              opacity: recargando ? 0.5 : 1,
            }}
          >
            <Ionicons name="close" size={26} color={color.textoTenue} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("postularme")}
            onPress={() => salir("postular")}
            disabled={recargando}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: color.accion,
              alignItems: "center",
              justifyContent: "center",
              opacity: recargando ? 0.5 : 1,
            }}
          >
            <Ionicons name="heart" size={28} color={color.accionTexto} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
