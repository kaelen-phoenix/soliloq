import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";
import { matchDeLaIniciativa, type IniciativaBuscada } from "@/lib/matches";
import { supabase } from "~/lib/supabase";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { avisarConvocatoriasNuevas } from "./convocatorias-nuevas";
import { marcarInteresEnTalento, marcarMatchMostrado } from "./datos";
import { PlacaInteres } from "./placa-interes";

export interface ResultadoTalento {
  id: string;
  nombre: string;
  /** #110: `null` si el talento tiene la edad oculta. */
  edad: number | null;
  ubicacion_publica: string | null;
  habilidades: string[];
  fotoUrl: string | null;
}

export type IniciativaPlaca = IniciativaBuscada & { fotoUrl: string | null };

const UMBRAL = 110;

/**
 * La pila de Buscar talento (#124), como `PilaTalentos` de la web: se desliza a la derecha
 * («Me interesa») o a la izquierda («No me interesa»), o se usan los dos botones de abajo. Si el
 * interés era mutuo se forma el match y aparece «Hay interés». Tocar la tarjeta abre el perfil.
 */
export function PilaTalentos({
  talentos,
  iniciativa,
  onCasiVacia,
}: {
  talentos: ResultadoTalento[];
  iniciativa: IniciativaPlaca;
  onCasiVacia: () => void;
}) {
  const t = useTranslations("proyectos.pilaTalentos");
  const tErr = useTranslations("proyectos.matches.errores");
  const color = useColores();
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [placa, setPlaca] = useState<{ talento: ResultadoTalento; matchId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSinMovimiento);
  }, []);

  const pila = useMemo(() => talentos.filter((p) => !descartados.has(p.id)), [talentos, descartados]);
  const arriba = pila[0];

  // La decisión la toma el gesto: se guarda en una ref para que el PanResponder vea la actual.
  const decidirRef = useRef<(interesa: boolean) => void>(() => {});

  function siguiente(id: string) {
    x.setValue(0);
    setDescartados((prev) => new Set(prev).add(id));
    if (pila.length <= 3) onCasiVacia();
  }

  async function decidir(interesa: boolean) {
    if (ocupado || !arriba) return;
    setOcupado(true);
    setError(null);
    const actual = arriba;
    const res = await marcarInteresEnTalento(actual.id, interesa, iniciativa);
    if (!res.ok) {
      setError(tErr(res.error));
      setOcupado(false);
      Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
      return;
    }
    if (interesa) {
      // ¿Se formó match? (el trigger lo crea si el interés era mutuo)
      const { data } = await supabase.rpc("mis_matches");
      const matchId = matchDeLaIniciativa(data, actual.id, iniciativa);
      if (matchId) {
        setPlaca({ talento: actual, matchId });
        setOcupado(false);
        return; // la placa maneja el avance
      }
    }
    setOcupado(false);
    siguiente(actual.id);
  }
  decidirRef.current = decidir;

  /** #365: «Aceptar» deja al Talento en Convocatorias y enciende el corazón (#366). */
  async function aceptarMatch() {
    if (!placa || ocupado) return;
    setOcupado(true);
    setError(null);
    const res = await marcarMatchMostrado(placa.matchId);
    setOcupado(false);
    if (!res.ok) return setError(tErr(res.error));
    const id = placa.talento.id;
    setPlaca(null);
    siguiente(id);
    avisarConvocatoriasNuevas();
  }

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => x.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          const fuerza = g.dx + g.vx * 60;
          if (fuerza < -UMBRAL) {
            Animated.timing(x, { toValue: -500, duration: 180, useNativeDriver: true }).start(() => decidirRef.current(false));
          } else if (fuerza > UMBRAL) {
            Animated.timing(x, { toValue: 500, duration: 180, useNativeDriver: true }).start(() => decidirRef.current(true));
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [x],
  );

  if (!arriba) {
    return (
      <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, backgroundColor: color.fondoSutil, padding: 14 }}>
        <Texto variante="tenue">{t("sinMas")}</Texto>
      </View>
    );
  }

  const rotar = x.interpolate({ inputRange: [-200, 200], outputRange: ["-12deg", "12deg"] });
  const opacidadNo = x.interpolate({ inputRange: [-120, -20], outputRange: [1, 0], extrapolate: "clamp" });
  const opacidadSi = x.interpolate({ inputRange: [20, 120], outputRange: [0, 1], extrapolate: "clamp" });

  const botonRedondo = {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: ocupado ? 0.4 : 1,
  };

  return (
    <View style={{ alignItems: "center", gap: 20 }}>
      <View style={{ width: "100%", maxWidth: 380, aspectRatio: 3 / 4 }}>
        {pila[1] && (
          <View
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              transform: [{ scale: 0.96 }],
              borderRadius: radio.tarjeta,
              borderWidth: 1,
              borderColor: color.borde,
              backgroundColor: color.superficie,
              opacity: 0.6,
            }}
          />
        )}
        <Animated.View
          key={arriba.id}
          {...(sinMovimiento ? {} : gesto.panHandlers)}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            transform: sinMovimiento ? [] : [{ translateX: x }, { rotate: rotar }],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[arriba.nombre, arriba.edad, arriba.ubicacion_publica].filter(Boolean).join(", ")}
            onPress={() => router.push(`/talentos/${arriba.id}` as Href)}
            style={{ flex: 1, borderRadius: radio.tarjeta, overflow: "hidden", borderWidth: 1, borderColor: color.borde, backgroundColor: "#0a0809" }}
          >
            {arriba.fotoUrl && <Image source={{ uri: arriba.fotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />}
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(10,8,9,0.55)" }} />
            <Animated.View
              style={{ position: "absolute", left: 16, top: 16, opacity: opacidadNo, borderWidth: 2, borderColor: "#fff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}
            >
              <Texto style={{ fontFamily: fuente.negrita, color: "#fff", textTransform: "uppercase" }}>{t("selloNo")}</Texto>
            </Animated.View>
            <Animated.View
              style={{ position: "absolute", right: 16, top: 16, opacity: opacidadSi, borderWidth: 2, borderColor: "#ff7a59", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}
            >
              <Texto style={{ fontFamily: fuente.negrita, color: "#ff7a59", textTransform: "uppercase" }}>{t("selloSi")}</Texto>
            </Animated.View>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, gap: 2 }}>
              <Texto style={{ fontFamily: fuente.semi, fontSize: 20, color: "#fff" }}>
                {arriba.nombre}
                {arriba.edad != null && <Texto style={{ fontSize: 20, color: "rgba(255,255,255,0.8)" }}> · {arriba.edad}</Texto>}
              </Texto>
              {!!arriba.ubicacion_publica && <Texto style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{arriba.ubicacion_publica}</Texto>}
              {arriba.habilidades.length > 0 && (
                <Texto numberOfLines={1} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  {arriba.habilidades.slice(0, 4).join(" · ")}
                </Texto>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </View>

      <View style={{ flexDirection: "row", gap: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("noMeInteresa")}
          disabled={ocupado}
          onPress={() => decidir(false)}
          style={[botonRedondo, { borderWidth: 2, borderColor: color.borde, backgroundColor: color.superficie }]}
        >
          <Ionicons name="close" size={28} color={color.textoTenue} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("meInteresa")}
          disabled={ocupado}
          onPress={() => decidir(true)}
          style={[botonRedondo, { backgroundColor: color.accion }]}
        >
          <Ionicons name="heart" size={26} color="#fff" />
        </Pressable>
      </View>

      {error && !placa && <Texto variante="error">{error}</Texto>}

      {placa && (
        <PlacaInteres
          visible
          titulo={t("hayInteres")}
          textoAceptar={t("aceptar")}
          persona={{ nombre: placa.talento.nombre, fotoUrl: placa.talento.fotoUrl }}
          iniciativa={{ titulo: iniciativa.titulo, fotoUrl: iniciativa.fotoUrl }}
          error={error}
          ocupado={ocupado}
          onAceptar={aceptarMatch}
        />
      )}
    </View>
  );
}
