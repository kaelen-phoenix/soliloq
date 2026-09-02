"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { Icono } from "@/components/ui/icono";

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
}: {
  userId: string;
  nombre: string;
  tokenInicial: string;
  activoInicial: boolean;
}) {
  const [token, setToken] = useState(tokenInicial);
  const [activo, setActivo] = useState(activoInicial);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function urlActual() {
    return `${window.location.origin}/p/${token}`;
  }

  async function activarSiHaceFalta() {
    if (activo) return true;
    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ enlace_publico_activo: true })
      .eq("id", userId);
    if (errorBd) {
      setError("No pudimos activar el enlace. Probá de nuevo.");
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
        await navigator.share({ title: `${nombre} en Yalope`, url });
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

  async function desactivar() {
    setError(null);
    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ enlace_publico_activo: false })
      .eq("id", userId);
    if (errorBd) {
      setError("No pudimos desactivar el enlace. Probá de nuevo.");
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
      setError("No pudimos regenerar el enlace. Probá de nuevo.");
      return;
    }
    setToken(nuevoToken);
  }

  const url = mostrarMenu ? urlActual() : "";
  const textoCompartir = `${nombre} en Yalope`;

  return (
    <section className="mt-8 max-w-2xl rounded-2xl border border-ink-100 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-ink-900">Compartir mi perfil</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            {activo
              ? "Tu enlace está activo: cualquiera que lo tenga ve tu vidriera pública, sin cuenta."
              : "Un enlace que se ve sin cuenta: tus fotos, tu presentación y tus habilidades o disciplinas. Nunca tu fecha de nacimiento, tu ubicación exacta ni tu contacto."}
          </p>
        </div>
        <Icono nombre="compartir" className="h-5 w-5 shrink-0 text-ink-300" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Boton onClick={compartir} cargando={cargando} textoCargando="Un momento…">
          Compartir
        </Boton>
        {copiado && (
          <span role="status" className="text-sm font-medium text-exito-600">
            Enlace copiado
          </span>
        )}
      </div>

      {mostrarMenu && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${textoCompartir} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir por WhatsApp"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
          >
            <Icono nombre="whatsapp" className="h-4 w-4" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartir)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir en X"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
          >
            <Icono nombre="x" className="h-4 w-4" />
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir en Facebook"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
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
            aria-label="Compartir en Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
          >
            <Icono nombre="instagram" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={copiarEnlace}
            className="flex h-9 items-center gap-1.5 rounded-full border border-ink-200 px-3 text-xs font-medium text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
          >
            <Icono nombre="enlace" className="h-3.5 w-3.5" />
            Copiar enlace
          </button>
        </div>
      )}

      {activo && (
        <div className="mt-3 flex gap-4 text-xs">
          <button
            type="button"
            onClick={regenerar}
            className="text-ink-500 underline underline-offset-4 hover:text-ink-900"
          >
            Regenerar enlace
          </button>
          <button
            type="button"
            onClick={desactivar}
            className="text-error-600 underline underline-offset-4 hover:text-error-800"
          >
            Desactivar enlace
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
    </section>
  );
}
