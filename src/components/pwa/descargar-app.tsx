"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { rutaPublica } from "@/i18n/idiomas";
import { esAndroid } from "@/lib/descarga-app";

const CLAVE_TARJETA_CERRADA = "yalope.tarjetaAppAndroid.cerrada";

/** Solo en Android (se decide en el navegador: las páginas se arman una vez para todos). */
function useEsAndroid() {
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(esAndroid(window.navigator.userAgent)), []);
  return android;
}

/** «Descargar la app» con el ícono de Android (#425): lleva a `/descargar`. */
export function BotonDescargarApp({ idioma, className }: { idioma: string; className?: string }) {
  const t = useTranslations("descargarApp");
  if (!useEsAndroid()) return null;
  return (
    <Link href={rutaPublica(idioma, "/descargar")} className={className}>
      <Icono nombre="android" className="h-4 w-4" />
      {t("boton")}
    </Link>
  );
}

/** Tarjeta discreta en Perfil (#425), solo en Android y hasta que se cierre. */
export function TarjetaDescargarApp() {
  const t = useTranslations("descargarApp");
  const android = useEsAndroid();
  const [cerrada, setCerrada] = useState(true);
  useEffect(() => {
    try {
      setCerrada(window.localStorage.getItem(CLAVE_TARJETA_CERRADA) === "1");
    } catch {
      setCerrada(false);
    }
  }, []);
  if (!android || cerrada) return null;

  function cerrar() {
    setCerrada(true);
    try {
      window.localStorage.setItem(CLAVE_TARJETA_CERRADA, "1");
    } catch {
      // Sin almacenamiento: se cierra por esta visita.
    }
  }

  return (
    <section className="mt-6 flex items-start gap-3 rounded-2xl border border-borde bg-fondo-sutil/50 p-4">
      <Icono nombre="android" className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-texto">{t("tarjetaTitulo")}</h2>
        <p className="mt-0.5 text-sm text-texto-tenue">{t("tarjetaTexto")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/descargar"
            className="inline-flex items-center gap-2 rounded-full bg-accion px-4 py-2 text-sm font-semibold text-accion-texto transition hover:brightness-110"
          >
            <Icono nombre="descargar" className="h-4 w-4" />
            {t("boton")}
          </Link>
          <button type="button" onClick={cerrar} className="text-sm text-texto-tenue hover:text-texto">
            {t("cerrar")}
          </button>
        </div>
      </div>
    </section>
  );
}
