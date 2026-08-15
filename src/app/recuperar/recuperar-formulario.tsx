"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGEX, mensajeErrorAuth, urlCallback } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export function RecuperarFormulario() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: urlCallback("/cambiar-clave"),
    });
    setCargando(false);

    if (errorEnvio) {
      setError(mensajeErrorAuth(errorEnvio.code, errorEnvio.message));
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-ink-100 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Revisá tu correo</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Si existe una cuenta con <span className="text-ink-900">{email}</span>, te enviamos un
          enlace para elegir una contraseña nueva.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        id="email"
        etiqueta="Tu email"
        type="email"
        autoComplete="email"
        placeholder="vos@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
      />
      <Boton type="submit" cargando={cargando} textoCargando="Enviando…">
        Enviarme el enlace
      </Boton>
    </form>
  );
}
