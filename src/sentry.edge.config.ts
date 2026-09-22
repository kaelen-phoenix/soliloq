import * as Sentry from "@sentry/nextjs";

// Runtime Edge: src/middleware.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
