import { test, expect } from "@playwright/test";

// Superficies públicas (sin sesión). Corren contra la app local con variables dummy.

test.describe("landing", () => {
  test("carga con la copy del modelo de match", async ({ page }) => {
    await page.goto("/bienvenida");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "El match de actores y actrices empieza acá",
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
    await page.getByRole("link", { name: "Crear perfil" }).first().click();
    await expect(page).toHaveURL(/\/ingresar/);
  });

  // #226: la portada enlaza «Apoyá el proyecto» y robots/sitemap la declaran pública, pero
  // el middleware la mandaba a /ingresar a quien no tenía sesión.
  test("«Apoyar» se ve sin sesión (no redirige a /ingresar)", async ({ page }) => {
    const res = await page.goto("/apoyar");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/apoyar$/);
    await expect(page.getByRole("heading", { level: 1, name: "Apoyá Yalope" })).toBeVisible();
  });

  // #352: Política de Privacidad y Términos se ven sin sesión y el alta las enlaza.
  for (const [ruta, titulo] of [
    ["/privacidad", "Política de Privacidad"],
    ["/terminos", "Términos y Condiciones"],
  ] as const) {
    test(`${ruta} se ve sin sesión`, async ({ page }) => {
      const res = await page.goto(ruta);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    });
  }

  test("el alta enlaza Términos y Política de Privacidad", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("link", { name: "Política de Privacidad" }).click();
    await expect(page).toHaveURL(/\/privacidad$/);
  });

  test("/ raíz sirve la landing para anónimos", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("match de actores");
  });

  // `page.goto` sigue redirects y devuelve el status de la respuesta final, así que un 307
  // a `/bienvenida` seguido de un 200 pasa el test de arriba igual — no distingue un rewrite
  // (200 directo, indexable) de un redirect. Ya pasó una vez: el middleware empezó a
  // redirigir "/" antes de que el rewrite pudiera correr. Este test pega directo a la API sin
  // seguir redirects para que una regresión así no vuelva a colarse. Desde #237 el rewrite a
  // la portada en el idioma de cada quien lo hace el middleware.
  test("/ raíz NO redirige (se sirve la portada ahí mismo)", async ({ request }) => {
    const res = await request.fetch("/", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});

// #237: las páginas públicas llevan el idioma en la URL para poder cachearse.
test.describe("idioma en la URL", () => {
  test("/en/bienvenida está en inglés y declara sus alternativas", async ({ page }) => {
    const res = await page.goto("/en/bienvenida");
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("match for");
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", /yalope\.com\/?$/);
  });

  test("un navegador en inglés que entra sin prefijo va a /en/…", async ({ request }) => {
    const res = await request.fetch("/privacidad", {
      maxRedirects: 0,
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/\/en\/privacidad$/);
  });

  test("en castellano la URL no lleva prefijo y no redirige", async ({ request }) => {
    const res = await request.fetch("/terminos", { maxRedirects: 0, headers: { "Accept-Language": "es-AR" } });
    expect(res.status()).toBe(200);
  });

  test("«Español» desde una página en inglés vuelve a la URL sin prefijo y lo recuerda", async ({ page }) => {
    await page.goto("/en/terminos");
    await page.getByRole("link", { name: "Español" }).click();
    // Exacta: `/\/terminos$/` también acepta `/en/terminos`, y el test leería la cookie antes
    // de que termine la navegación.
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/terminos$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos y Condiciones");
    await expect
      .poll(async () => (await page.context().cookies()).find((c) => c.name === "NEXT_LOCALE")?.value)
      .toBe("es");
  });

  test("el sitemap lista las dos versiones", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("https://yalope.com/en/privacidad");
    expect(xml).toContain("https://yalope.com/privacidad");
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
