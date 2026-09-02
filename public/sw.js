// Service worker mínimo. Su única razón de existir es que Chrome/Edge exigen un SW
// registrado con un handler de `fetch` para considerar la app instalable y disparar
// `beforeinstallprompt`. No cachea nada a propósito: así no hay riesgo de servir una
// versión vieja de la app (el deploy es continuo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Sin `respondWith`: cada request sigue yendo a la red como siempre.
});
