import { test, expect } from "@playwright/test";

// Superficies públicas (sin sesión). Corren contra la app local con variables dummy.

test.describe("landing", () => {
  test("carga con la copy del modelo de match", async ({ page }) => {
    await page.goto("/bienvenida");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "El casting teatral, en tu teléfono",
    );
    // Copy nueva (#129): el match de dos lados, proyecto/equipo, deslizar.
    await expect(page.getByText(/deslizás perfiles y propuestas/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deslizá" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Match, convocatoria y chat" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /armar proyecto o equipo/i })).toBeVisible();
  });

  test("los CTA llevan a /ingresar", async ({ page }) => {
    await page.goto("/bienvenida");
    await page.getByRole("link", { name: "Crear mi perfil" }).first().click();
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("/ raíz sirve la landing para anónimos", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("casting teatral");
  });
});

test.describe("acceso", () => {
  test("/ingresar tiene email y contraseña", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.getByLabel(/e-?mail|correo/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // El corte de sesión del área `(app)` → `/bienvenida` necesita un backend real;
  // vive en la suite de staging (`e2e/flujos/`).
});

test.describe("infra web", () => {
  test("robots.txt y sitemap.xml responden", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
  });

  test("manifest.webmanifest es válido y trae íconos", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(Array.isArray(m.icons)).toBe(true);
    expect(m.icons.length).toBeGreaterThan(0);
  });

  test("favicon.ico existe (no 404)", async ({ request }) => {
    const res = await request.get("/favicon.ico");
    expect(res.status()).toBe(200);
  });
});
