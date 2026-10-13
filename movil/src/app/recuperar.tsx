import { router } from "expo-router";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth } from "@/lib/clave";
import { supabase } from "~/lib/supabase";
import { Boton } from "~/ui/boton";
import { Campo } from "~/ui/campo";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";

/** Como `/recuperar` de la web: el enlace del correo abre la web para elegir la clave nueva. */
export default function Recuperar() {
  const t = useTranslations("cuenta.recuperar");
  const tIngresar = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setError(null);
    const correo = email.trim();
    if (!EMAIL_REGEX.test(correo)) return setError(tError("emailInvalido"));
    setCargando(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: "https://yalope.com/auth/callback?next=%2Fcambiar-clave",
    });
    setCargando(false);
    if (e) return setError(tError(mensajeErrorAuth(e.code), { minimo: LARGO_MINIMO_CLAVE }));
    setEnviado(true);
  }

  return (
    <Pantalla contentContainerStyle={{ justifyContent: "center" }}>
      {enviado ? (
        <>
          <Texto variante="subtitulo">{t("revisaTitulo")}</Texto>
          <Texto variante="tenue">
            {t.rich("revisaTexto", { email: email.trim(), b: (txt) => <Texto>{txt}</Texto> })}
          </Texto>
        </>
      ) : (
        <>
          <Texto variante="titulo">{t("titulo")}</Texto>
          <Texto variante="tenue">{t("bajada")}</Texto>
          <Campo
            etiqueta={tIngresar("tuEmail")}
            value={email}
            onChangeText={setEmail}
            placeholder={tIngresar("placeholderEmail")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onSubmitEditing={enviar}
            error={error}
          />
          <Boton onPress={enviar} cargando={cargando}>
            {cargando ? t("enviando") : t("enviar")}
          </Boton>
        </>
      )}
      <Boton variante="fantasma" onPress={() => router.back()}>
        {t("volverIngreso")}
      </Boton>
    </Pantalla>
  );
}
