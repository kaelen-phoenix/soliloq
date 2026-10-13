import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { ordenarSalas, type SalaItem } from "@/lib/salas-reglas";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { BadgeNoLeidos, useNoLeidos } from "./no-leidos";

/**
 * La lista de chats (`ListaSalas` de la web): destacados arriba, el resto por actividad; cada
 * uno con su menú (destacar, desvincularse) y lo sin leer encendido (#216).
 */
export function ListaSalas({
  salas: iniciales,
  userId,
  onCambio,
}: {
  salas: SalaItem[];
  userId: string;
  /** Algo cambió del lado del servidor (salió de un chat): que la pantalla relea. */
  onCambio: () => void;
}) {
  const t = useTranslations("chats.lista");
  const tAcciones = useTranslations("chats.acciones");
  const color = useColores();
  const { porSala: noLeidos } = useNoLeidos();
  const [salas, setSalas] = useState(() => ordenarSalas(iniciales));
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSalas(ordenarSalas(iniciales)), [iniciales]);

  async function alternarDestacado(s: SalaItem) {
    setOcupado(true);
    let fallo: string | null = null;
    if (s.destacadoEn) {
      const { error: e } = await supabase.from("chats_destacados").delete().eq("sala_id", s.salaId).eq("perfil_id", userId);
      if (e) fallo = tAcciones("errorQuitarDestacado");
    } else {
      // `creado_en` default now() da el orden: al re-destacar, sube. Por eso se borra y re-inserta.
      await supabase.from("chats_destacados").delete().eq("sala_id", s.salaId).eq("perfil_id", userId);
      const { error: e } = await supabase.from("chats_destacados").insert({ sala_id: s.salaId, perfil_id: userId });
      if (e) fallo = tAcciones("errorDestacar");
    }
    setOcupado(false);
    setMenuAbierto(null);
    if (fallo) return setError(fallo);
    setError(null);
    const destacadoEn = s.destacadoEn ? null : new Date().toISOString();
    setSalas((prev) => ordenarSalas(prev.map((x) => (x.salaId === s.salaId ? { ...x, destacadoEn } : x))));
  }

  async function desvincular(s: SalaItem) {
    setOcupado(true);
    // Por la web: además de salir, le saca el acceso al espacio de Discord (#269).
    const r = await llamarApi("salas", { accion: "desvincularme", salaId: s.salaId });
    setOcupado(false);
    setConfirmando(null);
    setMenuAbierto(null);
    if (!r.ok) {
      return setError(tAcciones(r.error === "errorDueno" ? "errorDueno" : "errorGenerico"));
    }
    setError(null);
    setSalas((prev) => prev.filter((x) => x.salaId !== s.salaId));
    onCambio();
  }

  return (
    <View style={{ gap: 8 }}>
      {error && <Texto variante="error">{error}</Texto>}
      {salas.map((s) => {
        const sinLeer = noLeidos.get(s.salaId) ?? 0;
        const etiqueta = !s.esDeIniciativa
          ? t("directo")
          : s.esDueno
            ? s.esEquipo
              ? t("miEquipo")
              : t("miProyecto")
            : s.esEquipo
              ? t("equipo")
              : t("proyecto");
        return (
          <View
            key={s.salaId}
            style={{
              borderRadius: radio.campo,
              borderWidth: 1,
              // #216: una sala con mensajes nuevos se «enciende», y gana sobre el destacado.
              borderColor: sinLeer > 0 ? "#e62d03" : s.destacadoEn ? "#fb6543" : color.borde,
              backgroundColor: sinLeer > 0 ? "rgba(230,45,3,0.06)" : color.superficie,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${etiqueta}, ${s.titulo}${sinLeer > 0 ? t("sinLeer", { n: sinLeer }) : ""}`}
                onPress={() => router.push(`/salas/${s.salaId}` as Href)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {s.destacadoEn && <Ionicons name="star" size={15} color="#c2410c" />}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Texto
                      style={{
                        fontFamily: fuente.semi,
                        fontSize: 10,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        overflow: "hidden",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        color: !s.esDeIniciativa ? color.textoTenue : s.esEquipo ? "#0b0a0c" : "#ffffff",
                        backgroundColor: !s.esDeIniciativa ? "transparent" : s.esEquipo ? "#fb6543" : "#c62703",
                        borderWidth: !s.esDeIniciativa ? 1 : 0,
                        borderColor: color.borde,
                      }}
                    >
                      {etiqueta}
                    </Texto>
                    <Texto numberOfLines={1} style={{ flex: 1, fontFamily: sinLeer > 0 ? fuente.semi : fuente.media }}>
                      {s.titulo}
                    </Texto>
                  </View>
                  <Texto variante={sinLeer > 0 ? "cuerpo" : "chico"} numberOfLines={1} style={sinLeer > 0 ? { fontSize: 14 } : undefined}>
                    {s.ultimoMensaje ?? t("salaRecienCreada")}
                  </Texto>
                </View>
                <BadgeNoLeidos cantidad={sinLeer} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("opciones")}
                accessibilityState={{ expanded: menuAbierto === s.salaId }}
                onPress={() => setMenuAbierto((m) => (m === s.salaId ? null : s.salaId))}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={color.textoTenue} />
              </Pressable>
            </View>

            {menuAbierto === s.salaId && (
              <View style={{ borderTopWidth: 1, borderTopColor: color.borde, paddingHorizontal: 14, paddingVertical: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={ocupado}
                  onPress={() => alternarDestacado(s)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}
                >
                  <Ionicons name={s.destacadoEn ? "star" : "star-outline"} size={16} color={color.texto} />
                  <Texto>{s.destacadoEn ? t("quitarDestacado") : t("destacar")}</Texto>
                </Pressable>
                {!s.esDueno && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={ocupado}
                    onPress={() => {
                      setMenuAbierto(null);
                      setConfirmando(s.salaId);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}
                  >
                    <Ionicons name="close" size={16} color={color.error} />
                    <Texto style={{ color: color.error }}>{t("desvincularme")}</Texto>
                  </Pressable>
                )}
              </View>
            )}

            {confirmando === s.salaId && (
              <View style={{ borderTopWidth: 1, borderTopColor: color.borde, padding: 14, gap: 10 }}>
                <Texto>{t("confirmarDesvincular", { titulo: s.titulo })}</Texto>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Boton variante="peligro" cargando={ocupado} onPress={() => desvincular(s)}>
                      {ocupado ? t("saliendo") : t("aceptar")}
                    </Boton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton variante="secundario" disabled={ocupado} onPress={() => setConfirmando(null)}>
                      {t("rechazar")}
                    </Boton>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
