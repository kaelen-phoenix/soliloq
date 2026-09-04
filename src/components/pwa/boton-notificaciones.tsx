"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Boton } from "@/components/ui/boton";
import { Icono } from "@/components/ui/icono";
import { guardarSuscripcionPush, borrarSuscripcionPush } from "@/app/acciones-push";

function base64UrlAUint8Array(base64Url: string) {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const cruda = atob(base64);
  const bytes = new Uint8Array(cruda.length);
  for (let i = 0; i < cruda.length; i++) bytes[i] = cruda.charCodeAt(i);
  return bytes;
}

type Estado = "sin-soporte" | "cargando" | "inactivo" | "activo" | "denegado";

/**
 * Activa/desactiva las notificaciones push del dispositivo actual («cuando te mandan un
 * mensaje»). Es por dispositivo, no por cuenta: cada celular/PC donde se instale o entre
 * tiene su propia suscripción en `push_suscripciones`.
 *
 * Sin soporte del navegador (falta `PushManager` o `Notification`) no se renderiza nada —
 * Safari desktop viejo, algunos navegadores de escritorio embebidos, etc.
 */
export function BotonNotificaciones() {
  const t = useTranslations("notificacionesPush");
  const [estado, setEstado] = useState<Estado>("cargando");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      typeof window.PushManager === "undefined" ||
      typeof window.Notification === "undefined"
    ) {
      setEstado("sin-soporte");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denegado");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registro) => registro.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? "activo" : "inactivo"))
      .catch(() => setEstado("inactivo"));
  }, []);

  async function activar() {
    setError(null);
    setCargando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "inactivo");
        return;
      }
      const clavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clavePublica) throw new Error("falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");

      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8Array(clavePublica),
      });
      const claves = sub.toJSON().keys;
      if (!claves?.p256dh || !claves.auth) throw new Error("suscripción sin claves");

      await guardarSuscripcionPush({
        endpoint: sub.endpoint,
        keys: { p256dh: claves.p256dh, auth: claves.auth },
      });
      setEstado("activo");
    } catch {
      setError(t("error"));
    } finally {
      setCargando(false);
    }
  }

  async function desactivar() {
    setError(null);
    setCargando(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcionPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setError(t("error"));
    } finally {
      setCargando(false);
    }
  }

  if (estado === "sin-soporte") return null;

  return (
    <section>
      <h2 className="text-sm font-medium text-texto">{t("titulo")}</h2>
      <p className="mb-3 mt-0.5 text-xs text-texto-tenue">
        {estado === "denegado" ? t("denegadoAyuda") : t("ayuda")}
      </p>
      {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
      {estado === "denegado" ? null : estado === "activo" ? (
        <Boton
          variante="secundario"
          onClick={desactivar}
          cargando={cargando}
          textoCargando={t("aplicando")}
        >
          <Icono nombre="campana" className="h-4 w-4" />
          {t("desactivar")}
        </Boton>
      ) : (
        <Boton
          variante="secundario"
          onClick={activar}
          cargando={cargando || estado === "cargando"}
          textoCargando={t("aplicando")}
        >
          <Icono nombre="campana" className="h-4 w-4" />
          {t("activar")}
        </Boton>
      )}
    </section>
  );
}
