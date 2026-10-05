import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests unitarios de la lógica pura (#355). Los de UI y flujos siguen en Playwright (`e2e/`).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // La zona de la mayoría de las personas usuarias: al oeste de UTC aparecen los errores de
    // fechas (`new Date("aaaa-mm-dd")` es medianoche UTC, el día anterior acá).
    env: { TZ: "America/Argentina/Buenos_Aires" },
  },
});
