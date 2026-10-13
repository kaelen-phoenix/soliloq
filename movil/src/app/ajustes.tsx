import { router } from "expo-router";
import { useState } from "react";
import { Linking, TextInput, View } from "react-native";
import { useTranslations } from "use-intl";
import type { Idioma } from "@/i18n/idiomas";
import { llamarApi } from "~/lib/api";
import { useIdioma } from "~/lib/intl";
import { usePush } from "~/lib/push";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Opciones, Tarjeta } from "~/ui/basicos";
import { Boton } from "~/ui/boton";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores, useTema, type Tema } from "~/ui/tema";

/** Como `/ajustes` de la web: idioma, tema y borrar la cuenta. Se guarda en `perfiles`. */
export default function Ajustes() {
  const t = useTranslations("ajustes");
  const tUi = useTranslations("cuenta.ui");
  const tComun = useTranslations("comun");
  const tPush = useTranslations("notificacionesPush");
  const push = usePush();
  const color = useColores();
  const { idioma, setIdioma } = useIdioma();
  const { tema, setTema } = useTema();
  const { sesion, cerrarSesion } = useSesion();
  const userId = sesion?.user.id;
  const [borrando, setBorrando] = useState<"no" | "confirmando" | "enCurso">("no");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const palabra = tUi("palabraBorrar");

  async function elegirIdioma(nuevo: Idioma) {
    setIdioma(nuevo);
    if (userId) await supabase.from("perfiles").update({ idioma: nuevo }).eq("id", userId);
  }

  async function elegirTema(nuevo: Tema) {
    setTema(nuevo);
    if (userId) await supabase.from("perfiles").update({ tema: nuevo }).eq("id", userId);
  }

  async function borrarCuenta() {
    setError(null);
    setBorrando("enCurso");
    const r = await llamarApi("borrar-cuenta");
    if (!r.ok) {
      setError(t("borrarCuentaError"));
      setBorrando("confirmando");
      return;
    }
    // La cuenta ya no existe: se limpia la sesión de este teléfono y vuelve a ingresar.
    await cerrarSesion();
  }

  return (
    <Pantalla>
      <Boton variante="fantasma" onPress={() => router.back()}>
        {tComun("volver")}
      </Boton>
      <Texto variante="titulo" accessibilityRole="header">
        {t("titulo")}
      </Texto>

      <View style={{ gap: 6 }}>
        <Texto variante="subtitulo">{t("idioma")}</Texto>
        <Texto variante="chico">{t("idiomaAyuda")}</Texto>
        <Opciones<Idioma>
          valor={idioma}
          onElegir={elegirIdioma}
          opciones={[
            { valor: "es", etiqueta: t("español") },
            { valor: "en", etiqueta: t("ingles") },
          ]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Texto variante="subtitulo">{t("tema")}</Texto>
        <Texto variante="chico">{t("temaAyuda")}</Texto>
        <Opciones<Tema>
          valor={tema}
          onElegir={elegirTema}
          opciones={[
            { valor: "sistema", etiqueta: t("sistema") },
            { valor: "claro", etiqueta: t("claro") },
            { valor: "oscuro", etiqueta: t("oscuro") },
          ]}
        />
      </View>

      {/* Notificaciones push en este teléfono (#389), como en Ajustes de la web. */}
      {push.estado !== "no-disponible" && (
        <View style={{ gap: 6 }}>
          <Texto variante="subtitulo">{tPush("titulo")}</Texto>
          <Texto variante="chico">{push.estado === "denegadas" ? tPush("denegadoAyudaApp") : tPush("ayuda")}</Texto>
          {push.estado === "sin-decidir" && (
            <Boton variante="secundario" onPress={push.activar}>
              {tPush("activar")}
            </Boton>
          )}
          {push.estado === "denegadas" && (
            <Boton variante="secundario" onPress={() => Linking.openSettings()}>
              {tPush("abrirConfiguracion")}
            </Boton>
          )}
        </View>
      )}

      <Tarjeta style={{ borderColor: color.error }}>
        <Texto variante="subtitulo">{t("zonaPeligro")}</Texto>
        <Texto variante="chico">{t("borrarCuentaAyuda")}</Texto>
        {borrando === "no" ? (
          <Boton variante="secundario" onPress={() => setBorrando("confirmando")}>
            {t("borrarCuenta")}
          </Boton>
        ) : (
          <>
            {/* Como `ConfirmarBorrado` de la web: hay que escribir la palabra. */}
            <Texto>{t("borrarCuentaConfirmar", { palabra })}</Texto>
            <TextInput
              accessibilityLabel={tUi("escribiParaConfirmar", { palabra })}
              value={confirmacion}
              onChangeText={setConfirmacion}
              placeholder={palabra}
              placeholderTextColor={color.textoTenue}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: color.borde,
                borderRadius: radio.campo,
                paddingHorizontal: 14,
                fontFamily: fuente.normal,
                fontSize: 16,
                color: color.texto,
              }}
            />
            {error && <Texto variante="error">{error}</Texto>}
            <Boton
              variante="peligro"
              disabled={confirmacion.trim().toUpperCase() !== palabra}
              cargando={borrando === "enCurso"}
              onPress={borrarCuenta}
            >
              {borrando === "enCurso" ? t("borrarCuentaEnCurso") : t("borrarCuentaDefinitivo")}
            </Boton>
            <Boton
              variante="secundario"
              disabled={borrando === "enCurso"}
              onPress={() => {
                setBorrando("no");
                setConfirmacion("");
                setError(null);
              }}
            >
              {t("cancelar")}
            </Boton>
          </>
        )}
      </Tarjeta>
    </Pantalla>
  );
}
