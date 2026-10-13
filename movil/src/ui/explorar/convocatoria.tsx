import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useTranslations } from "use-intl";
import { aFilaConvocatoria, claveErrorResponder, type FilaConvocatoria } from "@/lib/convocatoria-talento";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

const CORAL = "#c2410c";
const urlPublica = (p: string) => supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;

/** Las convocatorias pendientes del Talento (`mis_convocatorias`), con las fotos resueltas. */
export async function leerConvocatorias(): Promise<FilaConvocatoria[]> {
  const { data } = await supabase.rpc("mis_convocatorias");
  return (data ?? []).map((c) => aFilaConvocatoria(c, urlPublica));
}

/**
 * Aceptar o rechazar una convocatoria definitiva (#143), como `responderConvocatoria` de la web.
 * Devuelve la clave del error (`proyectos.convocatoria.errores`) o null.
 */
export async function responderConvocatoria(
  convocatoriaId: string,
  aceptar: boolean,
): Promise<"noDisponible" | "noSePudo" | null> {
  const { error } = await supabase.rpc("responder_convocatoria", {
    p_convocatoria_id: convocatoriaId,
    p_aceptar: aceptar,
  });
  if (error) return claveErrorResponder(error.message);
  // Si aceptó, ya está en la sala: entra también al espacio de Discord, si hay (#269).
  if (aceptar) llamarApi("discord", { accion: "mis-espacios" });
  return null;
}

/** Las dos fotos con el corazón en el medio, y el título. Común a la lista y al aviso. */
export function CabeceraConvocatoria({ fila, texto }: { fila: FilaConvocatoria; texto: React.ReactNode }) {
  const t = useTranslations("proyectos.convocatoria");
  const color = useColores();
  const caja = { width: 64, height: 64, backgroundColor: color.ink100, alignItems: "center", justifyContent: "center" } as const;
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Text style={{ fontFamily: fuente.semi, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: CORAL }}>
        {fila.esEquipo ? t("hayEquipo") : t("hayProyecto")}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {fila.talentoFotoUrl ? (
          <Image source={{ uri: fila.talentoFotoUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" />
        ) : (
          <View style={[caja, { borderRadius: 32 }]}>
            <Texto variante="tenue">·</Texto>
          </View>
        )}
        <Ionicons name="heart" size={20} color="#fb6543" />
        {fila.iniciativaFotoUrl ? (
          <Image
            source={{ uri: fila.iniciativaFotoUrl }}
            accessibilityLabel={fila.iniciativaTitulo}
            style={{ width: 64, height: 64, borderRadius: 12 }}
            contentFit="cover"
          />
        ) : (
          <View style={[caja, { borderRadius: 12, padding: 4 }]}>
            <Texto variante="chico" numberOfLines={3} style={{ textAlign: "center", fontSize: 11 }}>
              {fila.iniciativaTitulo}
            </Texto>
          </View>
        )}
      </View>
      <Texto style={{ textAlign: "center", fontSize: 14 }}>{texto}</Texto>
    </View>
  );
}

/**
 * La ventana de convocatoria definitiva (`AvisoConvocatoria` de la web, #203): aparece sola en
 * cualquier pantalla de la app apenas hay una convocatoria pendiente (al entrar, o en vivo por
 * Realtime). Cerrarla no rechaza nada: la próxima vez que se abra la app vuelve a aparecer.
 * Va montada una sola vez en el layout de las pestañas.
 */
export function AvisoConvocatoria({ userId, alAceptar }: { userId: string; alAceptar: () => void }) {
  const t = useTranslations("proyectos.convocatoria");
  const tErrores = useTranslations("proyectos.convocatoria.errores");
  const color = useColores();
  const [cola, setCola] = useState<FilaConvocatoria[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const filas = await leerConvocatorias();
      if (cancelado) return;
      setCola((prev) => {
        const vistas = new Set(prev.map((f) => f.convocatoriaId));
        return [...prev, ...filas.filter((f) => !vistas.has(f.convocatoriaId))];
      });
    }
    cargar();
    // `convocar()` inserta esta notificación (0063): se reusa en vez de abrir otro canal.
    const canal = supabase
      .channel(`convocatorias-aviso-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${userId}` },
        (payload) => {
          if ((payload.new as { tipo?: string }).tipo === "convocado") cargar();
        },
      );
    // El canal se une con la sesión ya puesta (#222): si no, Realtime evalúa RLS como anónimo.
    supabase.realtime
      .setAuth()
      .then(() => {
        if (!cancelado) canal.subscribe();
      })
      .catch(() => {});
    return () => {
      cancelado = true;
      supabase.removeChannel(canal);
    };
  }, [userId]);

  const actual = cola[0];
  if (!actual) return null;

  async function aceptar() {
    setOcupado(true);
    const clave = await responderConvocatoria(actual.convocatoriaId, true);
    setOcupado(false);
    if (clave) return setError(tErrores(clave));
    setError(null);
    setCola((prev) => prev.slice(1));
    alAceptar();
  }

  const cerrar = () => setCola((prev) => prev.slice(1));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable
        onPress={cerrar}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 32 }}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={actual.esEquipo ? t("hayEquipo") : t("hayProyecto")}
          onPress={() => {}}
          style={{ width: "100%", maxWidth: 320, gap: 16, borderRadius: radio.tarjeta, backgroundColor: color.superficie, padding: 20 }}
        >
          <CabeceraConvocatoria
            fila={actual}
            texto={t.rich("teConvocanA", {
              titulo: actual.iniciativaTitulo,
              b: (c) => <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{c}</Texto>,
            })}
          />
          {error && (
            <Texto variante="error" style={{ textAlign: "center" }}>
              {error}
            </Texto>
          )}
          <Boton onPress={aceptar} cargando={ocupado}>
            {t("aceptar")}
          </Boton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
