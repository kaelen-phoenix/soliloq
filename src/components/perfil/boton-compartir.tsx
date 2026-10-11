"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CodigoQr } from "@/components/ui/codigo-qr";
import { Icono } from "@/components/ui/icono";

/** Formato del nombre del enlace (0113): minúsculas, números y guiones, de 3 a 40. */
const FORMATO_ALIAS = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** «Ana Pérez» → «ana-perez»: una sugerencia para el nombre del enlace. */
function aAlias(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Compartir el perfil propio con un enlace que se ve sin cuenta. El primer uso activa el
 * enlace (estaba apagado por defecto) — por eso la línea de qué queda visible se muestra
 * siempre que todavía no se activó, antes de que la persona toque "Compartir".
 */
export function BotonCompartir({
  userId,
  nombre,
  tokenInicial,
  activoInicial,
  aliasInicial,
  visitas,
}: {
  userId: string;
  nombre: string;
  tokenInicial: string;
  activoInicial: boolean;
  /** #384: el nombre elegido para el enlace (`yalope.com/p/ana-perez`), si tiene. */
  aliasInicial: string | null;
  /** #384: cuántas veces se abrió el enlace (últimos 30 días y en total). */
  visitas: { ultimos30: number; total: number };
}) {
  const t = useTranslations("perfil.compartir");
  const [token, setToken] = useState(tokenInicial);
  const [activo, setActivo] = useState(activoInicial);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [urlQr, setUrlQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alias, setAlias] = useState(aliasInicial);
  const [aliasEditado, setAliasEditado] = useState(aliasInicial ?? aAlias(nombre));
  const [errorAlias, setErrorAlias] = useState<string | null>(null);
  const [aliasGuardado, setAliasGuardado] = useState(false);
  const [guardandoAlias, setGuardandoAlias] = useState(false);

  function urlActual(con: string | null = alias) {
    return `${window.location.origin}/p/${con ?? token}`;
  }

  async function guardarAlias() {
    setErrorAlias(null);
    setAliasGuardado(false);
    const valor = aliasEditado.trim().toLowerCase();
    if (valor && (!FORMATO_ALIAS.test(valor) || valor.length < 3 || valor.length > 40)) {
      setErrorAlias(t("aliasFormato"));
      return;
    }
    setGuardandoAlias(true);
    const { error: errorBd } = await createClient()
      .from("perfiles")
      .update({ enlace_alias: valor || null })
      .eq("id", userId);
    setGuardandoAlias(false);
    if (errorBd) {
      // 23505: lo usa otra persona; 23514: no cumple el formato (lo valida la base, 0113).
      setErrorAlias(errorBd.code === "23505" ? t("aliasOcupado") : errorBd.code === "23514" ? t("aliasFormato") : t("aliasError"));
      return;
    }
    setAlias(valor || null);
    setAliasGuardado(true);
    setUrlQr((prev) => (prev ? urlActual(valor || null) : null));
  }

  async function activarSiHaceFalta() {
    if (activo) return true;
    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ enlace_publico_activo: true })
      .eq("id", userId);
    if (errorBd) {
      setError(t("errorActivar"));
      return false;
    }
    setActivo(true);
    return true;
  }

  async function compartir() {
    setError(null);
    setCargando(true);
    const ok = await activarSiHaceFalta();
    setCargando(false);
    if (!ok) return;

    const url = urlActual();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("textoCompartir", { nombre }), url });
      } catch {
        // Cancelado por la persona: no es un error, no hace falta avisar nada.
      }
      return;
    }
    setMostrarMenu(true);
  }

  async function copiarEnlace() {
    setError(null);
    const ok = await activarSiHaceFalta();
    if (!ok) return;
    await navigator.clipboard.writeText(urlActual());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  async function alternarQr() {
    if (urlQr) {
      setUrlQr(null);
      return;
    }
    setError(null);
    setCargando(true);
    const ok = await activarSiHaceFalta();
    setCargando(false);
    if (ok) setUrlQr(urlActual());
  }

  async function desactivar() {
    setError(null);
    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ enlace_publico_activo: false })
      .eq("id", userId);
    if (errorBd) {
      setError(t("errorDesactivar"));
      return;
    }
    setActivo(false);
    setMostrarMenu(false);
  }

  async function regenerar() {
    setError(null);
    const nuevoToken = crypto.randomUUID();
    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ enlace_token: nuevoToken })
      .eq("id", userId);
    if (errorBd) {
      setError(t("errorRegenerar"));
      return;
    }
    setToken(nuevoToken);
    // El QR abierto apuntaba al token viejo: se refresca (si no hay nombre elegido, que es lo
    // que se comparte cuando lo hay).
    setUrlQr((prev) => (prev ? `${window.location.origin}/p/${alias ?? nuevoToken}` : null));
  }

  const url = mostrarMenu ? urlActual() : "";
  const textoCompartir = t("textoCompartir", { nombre });

  return (
    <section className="mt-8 max-w-2xl rounded-2xl border border-borde p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-texto">{t("titulo")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-texto-tenue">
            {activo ? t("activo") : t("inactivo")}
          </p>
          {activo && (
            <p className="mt-1 text-sm text-texto-tenue">
              {t("visitas", { n: visitas.ultimos30, total: visitas.total })}
            </p>
          )}
        </div>
        <Icono nombre="compartir" className="h-5 w-5 shrink-0 text-texto-tenue" />
      </div>

      {/* #384: el enlace con nombre propio, en lugar del código. */}
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="enlace-alias" className="text-sm font-medium text-texto">
          {t("aliasEtiqueta")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-borde bg-superficie px-3 focus-within:border-accion">
            <span className="shrink-0 text-sm text-texto-tenue">yalope.com/p/</span>
            <input
              id="enlace-alias"
              value={aliasEditado}
              onChange={(e) => {
                setAliasEditado(e.target.value.toLowerCase());
                setAliasGuardado(false);
              }}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-texto outline-none"
            />
          </div>
          <Boton type="button" variante="secundario" onClick={guardarAlias} cargando={guardandoAlias}>
            {t("aliasGuardar")}
          </Boton>
        </div>
        <p className="text-xs text-texto-tenue">{t("aliasAyuda")}</p>
        {aliasGuardado && (
          <p role="status" className="text-xs font-medium text-exito-600">
            {t("aliasListo")}
          </p>
        )}
        {errorAlias && <p className="text-xs text-error-600">{errorAlias}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Boton onClick={compartir} cargando={cargando} textoCargando={t("unMomento")}>
          {t("compartir")}
        </Boton>
        <button
          type="button"
          onClick={alternarQr}
          aria-pressed={urlQr !== null}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-borde px-4 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil"
        >
          <Icono nombre="qr" className="h-4 w-4" />
          {urlQr ? t("ocultarQr") : t("codigoQr")}
        </button>
        {copiado && (
          <span role="status" className="text-sm font-medium text-exito-600">
            {t("copiado")}
          </span>
        )}
      </div>

      {urlQr && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-borde bg-fondo-sutil/50 p-5 text-center">
          <div className="rounded-xl bg-superficie p-3 shadow-tarjeta">
            <CodigoQr valor={urlQr} tam={176} />
          </div>
          <p className="max-w-[36ch] text-xs leading-relaxed text-texto-tenue">
            {t("qrAyuda")}{" "}
            <span className="break-all font-medium text-texto">{urlQr}</span>
          </p>
        </div>
      )}

      {mostrarMenu && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${textoCompartir} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("whatsapp")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
          >
            <Icono nombre="whatsapp" className="h-4 w-4" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartir)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("x")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
          >
            <Icono nombre="x" className="h-4 w-4" />
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("facebook")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
          >
            <Icono nombre="facebook" className="h-4 w-4" />
          </a>
          {/* Instagram no tiene un enlace de intención como los demás: se copia el enlace y
              se abre Instagram para que lo pegue en una historia o un mensaje. */}
          <button
            type="button"
            onClick={() => {
              copiarEnlace();
              window.open("https://instagram.com", "_blank", "noopener,noreferrer");
            }}
            aria-label={t("instagram")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-borde text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
          >
            <Icono nombre="instagram" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={copiarEnlace}
            className="flex h-9 items-center gap-1.5 rounded-full border border-borde px-3 text-xs font-medium text-texto-tenue transition-colors hover:border-ink-400 hover:text-texto"
          >
            <Icono nombre="enlace" className="h-3.5 w-3.5" />
            {t("copiar")}
          </button>
        </div>
      )}

      {activo && (
        <div className="mt-3 flex gap-4 text-xs">
          <button
            type="button"
            onClick={regenerar}
            className="text-texto-tenue underline underline-offset-4 hover:text-texto"
          >
            {t("regenerar")}
          </button>
          <button
            type="button"
            onClick={desactivar}
            className="text-error-600 underline underline-offset-4 hover:text-error-800"
          >
            {t("desactivar")}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
    </section>
  );
}
