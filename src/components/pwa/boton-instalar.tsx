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

type Ayuda = "ios" | "generico" | null;

/**
 * Botón para instalar Yalope como PWA. Se muestra **siempre** (salvo que la app ya
 * esté corriendo instalada, donde no tendría sentido).
 *
 * - Android / Chrome / Edge: si el navegador ya disparó `beforeinstallprompt`, el botón
 *   abre el diálogo nativo.
 * - iOS / iPadOS: Safari no expone ese evento → instructivo (Compartir → «Agregar a inicio»).
 * - Cualquier otro caso (escritorio, Firefox, o Chrome antes de que dispare el evento):
 *   instructivo genérico (menú del navegador → «Instalar app»).
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
  const [oculto, setOculto] = useState(false);
  const [ayuda, setAyuda] = useState<Ayuda>(null);

  useEffect(() => {
    if (yaInstalada()) {
      setOculto(true);
      return;
    }

    // El SW es requisito para que Chrome considere la app instalable.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function alPoderInstalar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    }
    function alInstalar() {
      setEvento(null);
      setOculto(true);
    }

    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    window.addEventListener("appinstalled", alInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoderInstalar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (oculto) return null;

  async function instalar() {
    if (evento) {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      setEvento(null);
      if (outcome === "accepted") setOculto(true);
      return;
    }
    setAyuda(esIOS() ? "ios" : "generico");
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

  const titulo = ayuda === "ios" ? t("iosTitulo") : t("genericoTitulo");
  const pasos =
    ayuda === "ios"
      ? [t("iosPaso1"), t("iosPaso2"), t("iosPaso3")]
      : [t("genericoPaso1"), t("genericoPaso2"), t("genericoPaso3")];

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

      {ayuda ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setAyuda(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-superficie p-5 text-texto shadow-tarjeta"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold tracking-[-0.02em]">{titulo}</h3>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-texto-tenue">
              {pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setAyuda(null)}
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
