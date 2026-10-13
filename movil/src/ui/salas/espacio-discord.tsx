import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { router } from "expo-router";

/**
 * El espacio privado de la sala en Discord (#269), como `EspacioDiscord` de la web:
 * - si existe y tu Discord está vinculado → «Abrir en Discord»;
 * - si existe y no lo vinculaste → «Vinculá tu Discord» (por ahora en la web; nativo en #395);
 * - si no existe y sos el dueño → «Crear espacio en Discord».
 * Al abrirse, pone al día quién está en el espacio. Solo en salas de Proyectos y Equipos.
 */
export function EspacioDiscord({ salaId, esDueno, userId }: { salaId: string; esDueno: boolean; userId: string }) {
  const t = useTranslations("chats.comunidad");
  const tErrores = useTranslations("chats.accionesDiscord");
  const color = useColores();
  const [estado, setEstado] = useState<{ configurado: boolean; url: string | null; vinculado: boolean } | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, { data: perfil }] = await Promise.all([
        llamarApi<{ configurado: boolean; url: string | null }>("salas", { accion: "discord", salaId }),
        supabase.from("perfiles").select("discord_user_id").eq("id", userId).maybeSingle(),
      ]);
      if (!r.ok || !r.configurado) return;
      setEstado({ configurado: true, url: r.url, vinculado: !!perfil?.discord_user_id });
      if (r.url) void llamarApi("discord", { accion: "sala", salaId });
    })();
  }, [salaId, userId]);

  if (!estado) return null;

  async function crear() {
    setCreando(true);
    setError(null);
    const r = await llamarApi<{ url: string }>("discord", { accion: "abrir-espacio", salaId });
    setCreando(false);
    if (!r.ok) return setError(tErrores(r.error?.startsWith("espacio.") ? r.error : "errorCrear"));
    setEstado((e) => (e ? { ...e, url: r.url } : e));
    if (estado?.vinculado) Linking.openURL(r.url);
  }

  const pildora = (texto: string, onPress: () => void, deshabilitado = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      style={{
        borderWidth: 1,
        borderColor: color.borde,
        borderRadius: radio.pildora,
        paddingHorizontal: 12,
        paddingVertical: 6,
        opacity: deshabilitado ? 0.5 : 1,
      }}
    >
      <Texto style={{ fontFamily: fuente.media, fontSize: 12 }}>{texto}</Texto>
    </Pressable>
  );

  if (estado.url && estado.vinculado) return pildora(t("abrirEnDiscord"), () => Linking.openURL(estado.url!));
  if (estado.url) {
    // La vinculación se hace desde el Perfil (`VincularDiscord`).
    return pildora(t("vinculaTuDiscord"), () => router.push("/perfil"));
  }
  if (!esDueno) return null;
  return (
    <View style={{ alignItems: "flex-end", gap: 4 }}>
      {pildora(creando ? t("creando") : t("crearEspacio"), crear, creando)}
      {error && <Texto variante="error" style={{ fontSize: 11 }}>{error}</Texto>}
    </View>
  );
}
