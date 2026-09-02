"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icono } from "@/components/ui/icono";

// `beforeinstallprompt` no está en las tipas del DOM.
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function yaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS marca las apps agregadas al inicio con esta bandera propietaria.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    // iPadOS 13+ se presenta como Mac; se lo distingue por el touch.
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

/**
 * Botón para instalar Yalope como PWA.
 *
 * - Android / Chrome / Edge: dispara el diálogo nativo vía `beforeinstallprompt`.
 * - iOS / iPadOS: Safari no expone ese evento, así que el botón abre un instructivo
 *   (Compartir → «Agregar a inicio»).
 * - Si la app ya está instalada, no se renderiza nada.
 */
export function BotonInstalar({
  className,
  conSeccion = false,
}: {
  /** Clases del botón. Si no se pasa, usa el estilo secundario por defecto. */
  className?: string;
  /** Envuelve el botón en una `<section>` con título y ayuda (para Ajustes). */
  conSeccion?: boolean;
}) {
  const t = useTranslations("instalar");
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [visible, setVisible] = useState(false);
  const [ayudaIOS, setAyudaIOS] = useState(false);

  useEffect(() => {
    if (yaInstalada()) return;

    // El SW es requisito para que Chrome considere la app instalable.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function alPoderInstalar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
      setVisible(true);
    }
    function alInstalar() {
      setVisible(false);
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    window.addEventListener("appinstalled", alInstalar);

    // iOS no dispara `beforeinstallprompt`: se muestra igual, con instructivo.
    if (esIOS()) setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (!visible) return null;

  async function instalar() {
    if (!evento) {
      setAyudaIOS(true);
      return;
    }
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    if (outcome === "accepted") setVisible(false);
  }

  const boton = (
    <button
      type="button"
      onClick={instalar}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil"
      }
    >
      <Icono nombre="descargar" className="h-4 w-4" />
      {t("boton")}
    </button>
  );

  return (
    <>
      {conSeccion ? (
        <section>
          <h2 className="text-sm font-medium text-texto">{t("titulo")}</h2>
          <p className="mb-3 mt-0.5 text-xs text-texto-tenue">{t("ayuda")}</p>
          {boton}
        </section>
      ) : (
        boton
      )}

      {ayudaIOS ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("iosTitulo")}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setAyudaIOS(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-superficie p-5 text-texto shadow-tarjeta"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold tracking-[-0.02em]">
              {t("iosTitulo")}
            </h3>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-texto-tenue">
              <li>{t("iosPaso1")}</li>
              <li>{t("iosPaso2")}</li>
              <li>{t("iosPaso3")}</li>
            </ol>
            <button
              type="button"
              onClick={() => setAyudaIOS(false)}
              className="mt-5 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto"
            >
              {t("iosCerrar")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
