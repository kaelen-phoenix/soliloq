"use client";

import { useEffect } from "react";
import { CALLBACK_APP, esAppNativa } from "@/lib/app-nativa";

/**
 * Solo dentro de la app (#387). Google no deja iniciar sesión dentro de un WebView, así que el
 * login se abre en el navegador del sistema (`ingresar-formulario.tsx`) y vuelve a la app por
 * `com.yalope.app://auth/callback?code=…`. Acá se recibe ese enlace, se cierra el navegador y
 * se termina el ingreso en `/auth/callback`, que canjea el código con la cookie PKCE que quedó
 * en el WebView al empezar.
 */
export function PuenteApp() {
  useEffect(() => {
    if (!esAppNativa()) return;
    let quitar: (() => void) | undefined;
    let cancelado = false;
    (async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);
      const escucha = await App.addListener("appUrlOpen", ({ url }) => {
        if (!url.startsWith(CALLBACK_APP)) return;
        Browser.close().catch(() => {});
        window.location.assign(`/auth/callback${url.slice(CALLBACK_APP.length)}`);
      });
      if (cancelado) escucha.remove();
      else quitar = () => escucha.remove();
    })().catch(() => {});
    return () => {
      cancelado = true;
      quitar?.();
    };
  }, []);
  return null;
}
