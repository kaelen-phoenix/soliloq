"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth, urlCallback, validarClave } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

type Modo = "ingresar" | "registrarme";

/** `modoInicial`: el mail de invitación (#272) abre directo en «Crear cuenta». */
export function IngresarFormulario({ next, modoInicial = "ingresar" }: { next?: string; modoInicial?: Modo }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>(modoInicial);
  const tLegal = useTranslations("legal");
  const t = useTranslations("cuenta.ingresar");
  const tError = useTranslations("cuenta.errores");
  const tComun = useTranslations("comun");
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
      setError(tError("emailInvalido"));
      return;
    }

    if (modo === "registrarme") {
      const errorClave = validarClave(clave);
      if (errorClave) {
        setError(tError(errorClave, { minimo: LARGO_MINIMO_CLAVE }));
        return;
      }
    } else if (!clave) {
      setError(tError("claveVacia"));
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
        setError(tError(mensajeErrorAuth(errorIngreso.code), { minimo: LARGO_MINIMO_CLAVE }));
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
      setError(tError(mensajeErrorAuth(errorAlta.code), { minimo: LARGO_MINIMO_CLAVE }));
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
      options: {
        redirectTo: urlCallback(next),
        // Sin esto, Google reutiliza en silencio la última cuenta con sesión en el
        // navegador: después de cerrar sesión en Yalope, "Continuar con Google" volvía a
        // entrar con la misma cuenta sin dejar elegir otra (issue #147).
        queryParams: { prompt: "select_account" },
      },
    });
  }

  if (verificacionEnviada) {
    return (
      <div className="rounded-2xl border border-borde p-6">
        <h2 className="text-lg font-semibold text-texto">{t("confirmaTitulo")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-texto-tenue">
          {t.rich("confirmaTexto", {
            email,
            b: (texto) => <span className="text-texto">{texto}</span>,
          })}
        </p>
        <Boton
          variante="fantasma"
          className="mt-4 -ml-4"
          onClick={() => {
            setVerificacionEnviada(false);
            cambiarModo("ingresar");
          }}
        >
          {tComun("volver")}
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
            {m === "ingresar" ? t("ingresar") : t("crearCuenta")}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          etiqueta={t("tuEmail")}
          type="email"
          autoComplete="email"
          placeholder={t("placeholderEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <CampoTexto
          id="clave"
          etiqueta={t("clave")}
          type="password"
          autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
          placeholder={modo === "ingresar" ? t("placeholderClave") : t("placeholderClaveNueva")}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={error ?? undefined}
        />
        <Boton type="submit" cargando={cargando} textoCargando={t("unMomento")}>
          {modo === "ingresar" ? t("ingresar") : t("crearCuenta")}
        </Boton>
      </form>

      {modo === "ingresar" && (
        <Link
          href="/recuperar"
          className="self-start text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
        >
          {t("olvide")}
        </Link>
      )}

      <div className="flex items-center gap-3 text-2xs uppercase tracking-wide text-texto-tenue">
        <div className="h-px flex-1 bg-ink-100" />
        {t("o")}
        <div className="h-px flex-1 bg-ink-100" />
      </div>

      <Boton variante="secundario" onClick={ingresarConGoogle} type="button">
        {t("google")}
      </Boton>

      {/* #352: Google también crea la cuenta, así que el aviso va en los dos modos. */}
      <p className="text-xs leading-relaxed text-texto-tenue">
        {tLegal.rich("aceptacionAlta", {
          terminos: (texto) => (
            <Link href="/terminos" className="underline underline-offset-4 hover:text-texto">
              {texto}
            </Link>
          ),
          privacidad: (texto) => (
            <Link href="/privacidad" className="underline underline-offset-4 hover:text-texto">
              {texto}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
