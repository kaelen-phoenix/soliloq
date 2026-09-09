import { defineConfig, devices } from "@playwright/test";

/**
 * E2E con Playwright. Los tests de `e2e/*.spec.ts` que no necesitan sesión corren contra
 * la app local con variables dummy (igual que el `build` de CI). Los que necesitan sesión
 * (`e2e/flujos/*`) se saltean si no están `E2E_SUPABASE_URL` + `E2E_SERVICE_KEY` — apuntar
 * eso a un proyecto de staging, nunca a prod.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    locale: "es-AR",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${PORT}`,
        url: `http://localhost:${PORT}/bienvenida`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://e2e-placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-placeholder-anon-key",
          NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "e2e-placeholder-maps-key",
        },
      },
});
