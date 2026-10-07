"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { LARGO_MINIMO_CLAVE, mensajeErrorAuth, validarClave } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export function CambiarClaveFormulario({ destinoAlTerminar }: { destinoAlTerminar: string }) {
  const router = useRouter();
  const t = useTranslations("cuenta.cambiarClave");
  const tIngresar = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errorClave = validarClave(clave);
    if (errorClave) {
      setError(tError(errorClave, { minimo: LARGO_MINIMO_CLAVE }));
      return;
    }
    if (clave !== repetida) {
      setError(tError("noCoinciden"));
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorCambio } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);

    if (errorCambio) {
      setError(tError(mensajeErrorAuth(errorCambio.code), { minimo: LARGO_MINIMO_CLAVE }));
      return;
    }

    setListo(true);
    router.replace(destinoAlTerminar);
    router.refresh();
  }

  if (listo) {
    return (
      <p className="rounded-xl bg-exito-50 px-4 py-3 text-sm text-exito-800">
        {t("listo")}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        id="clave"
        etiqueta={t("nueva")}
        type="password"
        autoComplete="new-password"
        placeholder={tIngresar("placeholderClaveNueva")}
        value={clave}
        onChange={(e) => setClave(e.target.value)}
      />
      <CampoTexto
        id="clave-repetida"
        etiqueta={t("repetila")}
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        error={error ?? undefined}
      />
      <Boton type="submit" cargando={cargando}>
        {t("guardar")}
      </Boton>
    </form>
  );
}
