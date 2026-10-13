import { router } from "expo-router";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { LARGO_MINIMO_CLAVE, mensajeErrorAuth, validarClave } from "@/lib/clave";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Boton } from "~/ui/boton";
import { Campo } from "~/ui/campo";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";

/** Como `/cambiar-clave` de la web: mismas validaciones y mismos textos. */
export default function CambiarClave() {
  const t = useTranslations("cuenta.cambiarClave");
  const tIngresar = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const tComun = useTranslations("comun");
  const { sesion } = useSesion();
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar() {
    setError(null);
    const errorClave = validarClave(clave);
    if (errorClave) return setError(tError(errorClave, { minimo: LARGO_MINIMO_CLAVE }));
    if (clave !== repetida) return setError(tError("noCoinciden"));
    setCargando(true);
    const { error: e } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);
    if (e) return setError(tError(mensajeErrorAuth(e.code), { minimo: LARGO_MINIMO_CLAVE }));
    setListo(true);
  }

  return (
    <Pantalla>
      <Texto variante="titulo" accessibilityRole="header">
        {t("titulo")}
      </Texto>
      {listo ? (
        <Texto>{t("listo")}</Texto>
      ) : (
        <>
          <Texto variante="tenue">{t("bajada", { email: sesion?.user.email ?? "" })}</Texto>
          <Campo
            etiqueta={t("nueva")}
            value={clave}
            onChangeText={setClave}
            placeholder={tIngresar("placeholderClaveNueva")}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Campo
            etiqueta={t("repetila")}
            value={repetida}
            onChangeText={setRepetida}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={enviar}
            error={error}
          />
          <Boton onPress={enviar} cargando={cargando}>
            {t("guardar")}
          </Boton>
        </>
      )}
      <Boton variante="fantasma" onPress={() => router.back()}>
        {listo ? tComun("volver") : t("cancelar")}
      </Boton>
    </Pantalla>
  );
}
