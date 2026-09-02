"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGEX, mensajeErrorAuth, urlCallback, validarClave } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

type Modo = "ingresar" | "registrarme";

export function IngresarFormulario({ next }: { next?: string }) {
  const router = useRouter();
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

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }

    if (modo === "registrarme") {
      const errorClave = validarClave(clave);
      if (errorClave) {
        setError(errorClave);
        return;
      }
    } else if (!clave) {
      setError("Ingresá tu contraseña.");
      return;
    }

    setCargando(true);
    const supabase = createClient();

    if (modo === "ingresar") {
      const { error: errorIngreso } = await supabase.auth.signInWithPassword({
        email,
        password: clave,
      });
      setCargando(false);
      if (errorIngreso) {
        setError(mensajeErrorAuth(errorIngreso.code, errorIngreso.message));
        return;
      }
      // Sin `next` el middleware decide el destino real según el estado de la cuenta.
      router.replace(next ?? "/");
      router.refresh();
      return;
    }

    const { data, error: errorAlta } = await supabase.auth.signUp({
      email,
      password: clave,
      options: { emailRedirectTo: urlCallback(next) },
    });
    setCargando(false);

    if (errorAlta) {
      setError(mensajeErrorAuth(errorAlta.code, errorAlta.message));
      return;
    }

    // Con confirmación por email activada no hay sesión hasta abrir el enlace.
    if (data.session) {
      router.replace(next ?? "/");
      router.refresh();
      return;
    }

    setVerificacionEnviada(true);
  }

  async function ingresarConGoogle() {
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlCallback(next) },
    });
  }

  if (verificacionEnviada) {
    return (
      <div className="rounded-2xl border border-borde p-6">
        <h2 className="text-lg font-semibold text-texto">Confirmá tu email</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-texto-tenue">
          Te enviamos un enlace de verificación a{" "}
          <span className="text-texto">{email}</span>. Abrilo y vas a entrar con la contraseña
          que acabás de elegir.
        </p>
        <Boton
          variante="fantasma"
          className="mt-4 -ml-4"
          onClick={() => {
            setVerificacionEnviada(false);
            cambiarModo("ingresar");
          }}
        >
          Volver
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl bg-fondo-sutil p-1">
        {(["ingresar", "registrarme"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => cambiarModo(m)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              modo === m ? "bg-superficie text-texto shadow-sm" : "text-texto-tenue hover:text-texto"
            }`}
          >
            {m === "ingresar" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          etiqueta="Tu email"
          type="email"
          autoComplete="email"
          placeholder="vos@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <CampoTexto
          id="clave"
          etiqueta="Contraseña"
          type="password"
          autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
          placeholder={modo === "ingresar" ? "Tu contraseña" : "Al menos 8 caracteres"}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={error ?? undefined}
        />
        <Boton type="submit" cargando={cargando} textoCargando="Un momento…">
          {modo === "ingresar" ? "Ingresar" : "Crear cuenta"}
        </Boton>
      </form>

      {modo === "ingresar" && (
        <Link
          href="/recuperar"
          className="self-start text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
        >
          Olvidé mi contraseña
        </Link>
      )}

      <div className="flex items-center gap-3 text-2xs uppercase tracking-wide text-texto-tenue">
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
