"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth, urlCallback } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export function RecuperarFormulario() {
  const t = useTranslations("cuenta.recuperar");
  const tIngresar = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError(tError("emailInvalido"));
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: urlCallback("/cambiar-clave"),
    });
    setCargando(false);

    if (errorEnvio) {
      setError(tError(mensajeErrorAuth(errorEnvio.code), { minimo: LARGO_MINIMO_CLAVE }));
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-borde p-6">
        <h2 className="text-lg font-semibold text-texto">{t("revisaTitulo")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-texto-tenue">
          {t.rich("revisaTexto", {
            email,
            b: (texto) => <span className="text-texto">{texto}</span>,
          })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        id="email"
        etiqueta={tIngresar("tuEmail")}
        type="email"
        autoComplete="email"
        placeholder={tIngresar("placeholderEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
      />
      <Boton type="submit" cargando={cargando} textoCargando={t("enviando")}>
        {t("enviar")}
      </Boton>
    </form>
  );
}
