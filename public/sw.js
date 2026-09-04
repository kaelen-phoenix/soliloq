// Service worker. Dos razones de existir:
// 1. Chrome/Edge exigen un SW registrado con un handler de `fetch` para considerar la app
//    instalable y disparar `beforeinstallprompt`.
// 2. Es el único lugar donde puede llegar un evento `push` — el navegador lo entrega acá
//    incluso con la app cerrada, y de acá sale la notificación del sistema.
// No cachea nada a propósito: así no hay riesgo de servir una versión vieja de la app (el
// deploy es continuo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Sin `respondWith`: cada request sigue yendo a la red como siempre.
});

// El payload lo arma `notificarMensajeNuevo` (server action) como JSON:
// { title, body, url, tag }. `tag` agrupa notificaciones del mismo origen (una sala) para
// que no se acumulen: la última reemplaza a la anterior en vez de apilarse.
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    // Payload que no es JSON: se ignora el cuerpo, la notificación sale igual con lo
    // mínimo de abajo.
  }
  const { title = "Yalope", body = "", url = "/", tag } = datos;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png?v=2",
      badge: "/icons/icon-192.png?v=2",
      data: { url },
    })
  );
});

// Un click enfoca una pestaña ya abierta en esa URL si existe; si no, abre una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      const abierta = lista.find((c) => c.url.includes(url));
      if (abierta) return abierta.focus();
      return self.clients.openWindow(url);
    })
  );
});
