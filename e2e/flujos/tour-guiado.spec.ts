import { test, expect, devices, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Tour guiado de la primera vez (#231, migración 0084), en teléfono. A diferencia del resto
 * de `flujos/`, acá los usuarios nacen **sin** las marcas `tour_*_visto_en`, como una cuenta
 * nueva de verdad.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.use({ ...devices["Pixel 7"] });

test.describe("tour guiado (UI)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function cuentaNueva(nombre: string, opciones: { creador?: boolean } = {}) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    const id = data.user.id;
    usuariosCreados.push(id);
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: new Date().toISOString(),
        normas_aceptadas_en: new Date().toISOString(),
        modo_activo: "talento",
      })
      .eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id,
      nombre,
      fecha_nacimiento: "1995-01-01",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Buenos Aires",
      ubicacion_lat: -34.6037,
      ubicacion_lng: -58.3816,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      // Las tarjetas de ejemplo del feed (0024) son otro onboarding: acá no molestan.
      onboarding_visto_en: new Date().toISOString(),
    });
    if (e2) throw e2;
    if (opciones.creador) {
      const { error: e3 } = await admin!.from("perfiles_creador").insert({ id });
      if (e3) throw e3;
    }
    return { id, email };
  }

  async function marcas(id: string) {
    const { data } = await admin!
      .from("perfiles")
      .select("tour_talento_visto_en, tour_creador_visto_en")
      .eq("id", id)
      .single();
    return { talento: data?.tour_talento_visto_en != null, creador: data?.tour_creador_visto_en != null };
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  const tour = (page: Page) => page.getByRole("dialog", { name: "Recorrido guiado" });

  test("Talento nuevo: recorre los pasos con «Siguiente», termina y no vuelve a aparecer", async ({
    page,
  }) => {
    const cuenta = await cuentaNueva("Talento Tour");
    await login(page, cuenta.email);
    await page.goto("/");

    const globo = tour(page);
    await expect(globo).toBeVisible({ timeout: 15_000 });
    const titulos = [
      "Te damos la bienvenida a Yalope",
      "Explorar",
      "Me interesa",
      "Match y convocatoria",
      "Tus proyectos",
      "Chats",
      "Notificaciones",
      "Tu perfil",
    ];
    for (const [i, titulo] of titulos.entries()) {
      await expect(globo.getByText(`Paso ${i + 1} de ${titulos.length}`)).toBeVisible();
      await expect(globo.getByRole("heading", { name: titulo })).toBeVisible();
      // En teléfono el globo entra entero en la pantalla.
      const caja = await globo.boundingBox();
      const vista = page.viewportSize()!;
      expect(caja!.x).toBeGreaterThanOrEqual(0);
      expect(caja!.x + caja!.width).toBeLessThanOrEqual(vista.width);
      expect(caja!.y + caja!.height).toBeLessThanOrEqual(vista.height);
      const boton = i === titulos.length - 1 ? "Entendido" : "Siguiente";
      await globo.getByRole("button", { name: boton }).click();
    }
    await expect(globo).toHaveCount(0);

    // #288: un solo tour; se marcan las dos columnas de 0084.
    await expect.poll(() => marcas(cuenta.id), { timeout: 10_000 }).toEqual({
      talento: true,
      creador: true,
    });
    await page.reload();
    await expect(page.getByRole("link", { name: "Chats" })).toBeVisible({ timeout: 15_000 });
    await expect(tour(page)).toHaveCount(0);
  });

  test("«Omitir» lo cierra y cuenta como visto", async ({ page }) => {
    const cuenta = await cuentaNueva("Talento Omite");
    await login(page, cuenta.email);
    await page.goto("/");
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    await tour(page).getByRole("button", { name: "Omitir" }).click();
    await expect(tour(page)).toHaveCount(0);
    await expect.poll(async () => (await marcas(cuenta.id)).talento, { timeout: 10_000 }).toBe(true);
    await page.reload();
    await expect(page.getByRole("link", { name: "Chats" })).toBeVisible({ timeout: 15_000 });
    await expect(tour(page)).toHaveCount(0);
  });

  test("Las flechas del teclado no actúan sobre el feed detrás del tour", async ({ page }) => {
    const cuenta = await cuentaNueva("Talento Flechas");
    // Una obra en el feed, para que ← / → tengan algo que descartar o marcar.
    const creador = await cuentaNueva("Creadora Flechas");
    await admin!
      .from("perfiles")
      .update({ tour_talento_visto_en: new Date().toISOString(), tour_creador_visto_en: new Date().toISOString() })
      .eq("id", creador.id);
    const { data: obra, error } = await admin!
      .from("obras")
      .insert({
        creador_id: creador.id,
        titulo: "Obra de las flechas",
        estado: "publicada",
        ubicacion_texto: "Buenos Aires, Argentina",
        ubicacion_lat: -34.6037,
        ubicacion_lng: -58.3816,
        ubicacion_pais: "AR",
      })
      .select("id")
      .single();
    if (error) throw error;
    await admin!.from("roles").insert({ obra_id: obra.id, nombre: "Protagonista", tipo: "actuacion", vacantes: 1 });

    await login(page, cuenta.email);
    await page.goto("/");
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(1_000);
    const { data } = await admin!.from("intereses_match").select("id").eq("de_perfil", cuenta.id);
    expect(data).toHaveLength(0);
    await expect(tour(page)).toBeVisible();
  });

  test("Con Proyectos: el mismo tour, sin modos, y Matches en la navegación", async ({ page }) => {
    const cuenta = await cuentaNueva("Doble Tour", { creador: true });
    await login(page, cuenta.email);
    await page.goto("/");
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    await expect(tour(page).getByText("Paso 1 de 8")).toBeVisible();
    await tour(page).getByRole("button", { name: "Omitir" }).click();
    await expect(tour(page)).toHaveCount(0);

    // #288: no hay «Cambiar a Creador»; Proyectos y Matches están siempre a mano.
    await expect(page.getByRole("button", { name: /Cambiar a/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Matches" }).first()).toBeVisible();
    await page.getByRole("link", { name: /Proyectos/ }).first().click();
    await page.waitForURL(/\/proyectos$/);
    await expect(tour(page)).toHaveCount(0);
  });

  test("Ajustes: «Ver el recorrido de nuevo» lo vuelve a mostrar", async ({ page }) => {
    const cuenta = await cuentaNueva("Talento Repite");
    await login(page, cuenta.email);
    await page.goto("/");
    await tour(page).getByRole("button", { name: "Omitir" }).click();
    await expect.poll(async () => (await marcas(cuenta.id)).talento, { timeout: 10_000 }).toBe(true);

    // Navegación en la misma página (sin recargar): el componente del tour sigue montado con
    // su estado de "cerrado", y tiene que volver a abrirse igual (review de #236).
    await page.getByRole("link", { name: "Ajustes" }).first().click();
    await page.waitForURL(/\/ajustes/);
    await page.getByRole("button", { name: "Ver el recorrido de nuevo" }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 });
    await expect(tour(page)).toBeVisible({ timeout: 15_000 });
    await expect(tour(page).getByText("Paso 1 de 8")).toBeVisible();
  });
});
