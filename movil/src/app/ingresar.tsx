import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth, validarClave } from "@/lib/clave";
import { ingresarConGoogle } from "~/lib/google";
import { supabase } from "~/lib/supabase";
import { abrirWeb } from "~/lib/web";
import { Boton } from "~/ui/boton";
import { Campo } from "~/ui/campo";
import { Marca } from "~/ui/marca";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { useColores, fuente, radio } from "~/ui/tema";

type Modo = "ingresar" | "registrarme";

/** Lo mismo que `ingresar-formulario.tsx` de la web: mismas validaciones y mismos textos. */
export default function Ingresar() {
  const color = useColores();
  const t = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const tComun = useTranslations("comun");
  const tLegal = useTranslations("legal");
  const [modo, setModo] = useState<Modo>("ingresar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [verificacionEnviada, setVerificacionEnviada] = useState(false);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setClave("");
  }

  const errorAuth = (codigo: string | undefined) =>
    tError(mensajeErrorAuth(codigo), { minimo: LARGO_MINIMO_CLAVE });

  async function enviar() {
    setError(null);
    const correo = email.trim();
    if (!EMAIL_REGEX.test(correo)) return setError(tError("emailInvalido"));
    if (modo === "registrarme") {
      const errorClave = validarClave(clave);
      if (errorClave) return setError(tError(errorClave, { minimo: LARGO_MINIMO_CLAVE }));
    } else if (!clave) {
      return setError(tError("claveVacia"));
    }

    setCargando(true);
    if (modo === "ingresar") {
      const { error: e } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
      setCargando(false);
      // Con sesión, la navegación lleva sola a donde corresponde (`_layout.tsx`).
      if (e) setError(errorAuth(e.code));
      return;
    }
    const { data, error: e } = await supabase.auth.signUp({
      email: correo,
      password: clave,
      // El enlace del correo se abre en la web, que confirma la cuenta.
      options: { emailRedirectTo: "https://yalope.com/auth/callback" },
    });
    setCargando(false);
    if (e) return setError(errorAuth(e.code));
    if (!data.session) setVerificacionEnviada(true);
  }

  async function google() {
    setError(null);
    const codigo = await ingresarConGoogle();
    if (codigo) setError(errorAuth(codigo));
  }

  if (verificacionEnviada) {
    return (
      <Pantalla contentContainerStyle={{ justifyContent: "center" }}>
        <Texto variante="subtitulo">{t("confirmaTitulo")}</Texto>
        <Texto variante="tenue">
          {t.rich("confirmaTexto", { email: email.trim(), b: (txt) => <Texto>{txt}</Texto> })}
        </Texto>
        <Boton
          variante="secundario"
          onPress={() => {
            setVerificacionEnviada(false);
            cambiarModo("ingresar");
          }}
        >
          {tComun("volver")}
        </Boton>
      </Pantalla>
    );
  }

  return (
    <Pantalla contentContainerStyle={{ justifyContent: "center", gap: 20 }}>
      <Marca />

      <View
        style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: radio.campo, backgroundColor: color.fondoSutil }}
      >
        {(["ingresar", "registrarme"] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: modo === m }}
            onPress={() => cambiarModo(m)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 9,
              alignItems: "center",
              backgroundColor: modo === m ? color.superficie : "transparent",
            }}
          >
            <Texto
              style={{ fontFamily: fuente.media, fontSize: 15, color: modo === m ? color.texto : color.textoTenue }}
            >
              {m === "ingresar" ? t("ingresar") : t("crearCuenta")}
            </Texto>
          </Pressable>
        ))}
      </View>

      <Campo
        etiqueta={t("tuEmail")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("placeholderEmail")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Campo
        etiqueta={t("clave")}
        value={clave}
        onChangeText={setClave}
        placeholder={modo === "ingresar" ? t("placeholderClave") : t("placeholderClaveNueva")}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
        textContentType={modo === "ingresar" ? "password" : "newPassword"}
        onSubmitEditing={enviar}
        error={error}
      />
      <Boton onPress={enviar} cargando={cargando}>
        {cargando ? t("unMomento") : modo === "ingresar" ? t("ingresar") : t("crearCuenta")}
      </Boton>

      {modo === "ingresar" && (
        <Link href="/recuperar" asChild>
          <Pressable accessibilityRole="link">
            <Texto variante="tenue" style={{ textDecorationLine: "underline" }}>
              {t("olvide")}
            </Texto>
          </Pressable>
        </Link>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: color.ink100 }} />
        <Texto variante="chico" style={{ textTransform: "uppercase" }}>
          {t("o")}
        </Texto>
        <View style={{ flex: 1, height: 1, backgroundColor: color.ink100 }} />
      </View>

      <Boton variante="secundario" onPress={google}>
        {t("google")}
      </Boton>

      {/* #352: Google también crea la cuenta, así que el aviso va en los dos modos. */}
      <Texto variante="chico">
        {tLegal.rich("aceptacionAlta", {
          terminos: (txt) => (
            <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={() => abrirWeb("/terminos")}>
              {txt}
            </Texto>
          ),
          privacidad: (txt) => (
            <Texto
              variante="chico"
              style={{ textDecorationLine: "underline" }}
              onPress={() => abrirWeb("/privacidad")}
            >
              {txt}
            </Texto>
          ),
        })}
      </Texto>
    </Pantalla>
  );
}
