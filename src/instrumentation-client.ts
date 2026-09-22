import * as Sentry from "@sentry/nextjs";

// Runtime browser. Mismo DSN que el server y el edge (sentry.server.config.ts /
// sentry.edge.config.ts) — Sentry los separa por archivo, no por proyecto.
// Alcance inicial: errores + tracing. Replay/Logs quedan para una iteración aparte (la app
// maneja fotos y mensajes de chat reales; Replay pide una pasada de privacidad propia).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
