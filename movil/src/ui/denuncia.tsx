import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import type { MotivoDenuncia } from "@/lib/supabase/types";
import { supabase } from "~/lib/supabase";
import { Casilla, Tarjeta } from "./basicos";
import { Boton } from "./boton";
import { Campo } from "./campo";
import { Texto } from "./texto";
import { useColores } from "./tema";

/** Valores del enum de la base; la etiqueta de cada uno está en `cuenta.denuncia.motivos`. */
const MOTIVOS: MotivoDenuncia[] = [
  "acoso",
  "discriminacion",
  "perfil_falso",
  "estafa",
  "convocatoria_enganosa",
  "contenido_inapropiado",
  "otro",
];

/**
 * Denunciar una persona, una convocatoria o una sala, como `BotonDenuncia` de la web: discreto
 * y en gris, siempre disponible. No bloquea ni esconde nada por su cuenta: registra el caso
 * para que lo revise una persona.
 */
export function Denuncia({
  perfilDenunciadoId,
  obraId,
  salaId,
  queSeDenuncia,
}: {
  perfilDenunciadoId?: string;
  obraId?: string;
  salaId?: string;
  /** Cómo nombrar lo denunciado en el encabezado, ya traducido. Ej: "a Natalia". */
  queSeDenuncia: string;
}) {
  const t = useTranslations("cuenta.denuncia");
  const color = useColores();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnviando(false);
      return setError(t("sinSesion"));
    }
    const { error: e } = await supabase.from("denuncias").insert({
      denunciante_id: user.id,
      perfil_denunciado_id: perfilDenunciadoId ?? null,
      obra_id: obraId ?? null,
      sala_id: salaId ?? null,
      motivo,
      detalle: detalle.trim() || null,
    });
    setEnviando(false);
    // El índice único deja pasar una sola denuncia abierta por objeto y denunciante.
    if (e) return setError(e.code === "23505" ? t("yaEnviada") : t("error"));
    setEnviada(true);
  }

  if (!abierto) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setAbierto(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
        <Ionicons name="flag-outline" size={14} color={color.textoTenue} />
        <Texto variante="chico" style={{ textDecorationLine: "underline" }}>{t("denunciar")}</Texto>
      </Pressable>
    );
  }

  if (enviada) {
    return (
      <Tarjeta>
        <Texto variante="subtitulo">{t("recibidaTitulo")}</Texto>
        <Texto variante="tenue">{t("recibidaTexto")}</Texto>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Texto variante="subtitulo" style={{ flex: 1 }}>{t("titulo", { que: queSeDenuncia })}</Texto>
        <Pressable accessibilityRole="button" accessibilityLabel={t("cerrar")} onPress={() => setAbierto(false)} hitSlop={10}>
          <Ionicons name="close" size={20} color={color.textoTenue} />
        </Pressable>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("motivo")} style={{ gap: 10 }}>
        {MOTIVOS.map((m) => (
          <Casilla key={m} marcada={motivo === m} onCambio={() => setMotivo(m)}>
            <Texto>{t(`motivos.${m}`)}</Texto>
          </Casilla>
        ))}
      </View>
      <Campo
        etiqueta={t("motivo")}
        value={detalle}
        onChangeText={setDetalle}
        placeholder={t("placeholder")}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        style={{ minHeight: 90, paddingTop: 12 }}
      />
      {error && <Texto variante="error">{error}</Texto>}
      <Boton onPress={enviar} disabled={!motivo} cargando={enviando}>
        {enviando ? t("enviando") : t("enviar")}
      </Boton>
    </Tarjeta>
  );
}

/** Mismo nombre que el de la web (`BotonDenuncia`). */
export const BotonDenuncia = Denuncia;
