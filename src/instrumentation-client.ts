import * as Sentry from "@sentry/nextjs";

// Runtime browser. Mismo DSN que el server y el edge (sentry.server.config.ts /
// sentry.edge.config.ts) — Sentry los separa por archivo, no por proyecto.
// Alcance inicial: errores + tracing. Replay/Logs quedan para una iteración aparte (la app
// maneja fotos y mensajes de chat reales; Replay pide una pasada de privacidad propia).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Cortes de red del dispositivo (sin señal, app en segundo plano): no son errores de la
  // app y no se pueden arreglar desde acá (#285). Mismo criterio que `esCorteDeRed`.
  ignoreErrors: [/failed to fetch/i, /load failed/i, /networkerror/i, /network error/i, /the network connection was lost/i],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
