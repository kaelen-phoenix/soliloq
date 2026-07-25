"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function IngresarFormulario() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // El origen real del navegador, no una variable de build: así el redirect es correcto
  // en producción, en cada deploy de preview y en local, sin depender de configuración.
  const urlCallback = () => `${window.location.origin}/auth/callback`;

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: urlCallback() },
    });
    setCargando(false);

    if (errorEnvio) {
      setError("No pudimos enviar el enlace. Probá de nuevo en unos minutos.");
      return;
    }

    setEnviado(true);
  }

  async function ingresarConGoogle() {
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlCallback() },
    });
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-ink-100 p-6">
        <h2 className="text-[17px] font-semibold text-ink-900">Revisá tu correo</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          Te enviamos un enlace de acceso a <span className="text-ink-900">{email}</span>. Abrilo
          desde este mismo dispositivo.
        </p>
        <Boton variante="fantasma" className="mt-4 -ml-4" onClick={() => setEnviado(false)}>
          Usar otro email
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={enviarMagicLink} className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          etiqueta="Tu email"
          type="email"
          placeholder="vos@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />
        <Boton type="submit" cargando={cargando}>
          Enviarme un enlace de acceso
        </Boton>
      </form>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-300">
        <div className="h-px flex-1 bg-ink-100" />
        o
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <Boton variante="secundario" onClick={ingresarConGoogle} type="button">
        Continuar con Google
      </Boton>
    </div>
  );
}
