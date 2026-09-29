import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * «No mostrar mi edad» (#250): con la edad oculta no aparece en ninguna vista del perfil,
 * ni en la propia (antes el dueño la veía siempre y parecía que la opción no andaba) ni
 * cuando lo abre otra cuenta. Con la edad visible, sí aparece.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
// Nacida hace 30 años y un día: la edad es 30 sin importar la fecha en que corra el test.
const NACIMIENTO = new Date(Date.now() - (30 * 365.25 + 1) * 86_400_000).toISOString().slice(0, 10);

test.describe("edad oculta en el perfil", () => {
  test.setTimeout(90_000);
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  /** `creador`: para ver perfiles ajenos en `/talentos/[id]` hace falta ser Creador (RLS). */
  async function talento(nombre: string, edadVisible: boolean, creador = false) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    const id = data.user.id;
    usuariosCreados.push(id);
    const ahora = new Date().toISOString();
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: ahora,
        normas_aceptadas_en: ahora,
        modo_activo: "talento",
        tour_talento_visto_en: ahora,
        tour_creador_visto_en: ahora,
      })
      .eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id,
      nombre,
      fecha_nacimiento: NACIMIENTO,
      edad_visible: edadVisible,
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo",
      ubicacion_lat: -34.58,
      ubicacion_lng: -58.42,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      onboarding_visto_en: ahora,
    });
    if (e2) throw e2;
    if (creador) {
      const { error: e3 } = await admin!.from("perfiles_creador").insert({ id, disciplinas: ["actuacion"] });
      if (e3) throw e3;
    }
    return { id, email };
  }

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  test("oculta: no sale en el perfil propio ni visto desde otra cuenta", async ({ page }) => {
    const oculta = await talento("Edad Oculta E2E", false);
    const otra = await talento("Mirona E2E", true, true);

    await login(page, oculta.email);
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Edad Oculta E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Palermo")).toBeVisible();
    await expect(page.getByText("30 años")).toHaveCount(0);
    await expect(page.getByText("Tu edad está oculta")).toBeVisible();

    await page.context().clearCookies();
    await login(page, otra.email);
    await page.goto(`/talentos/${oculta.id}`);
    await expect(page.getByRole("heading", { name: "Edad Oculta E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Palermo")).toBeVisible();
    await expect(page.getByText("30 años")).toHaveCount(0);
    await expect(page.getByText("Tu edad está oculta")).toHaveCount(0);
  });

  test("visible: sale en el perfil propio y visto desde otra cuenta", async ({ page }) => {
    const visible = await talento("Edad Visible E2E", true);
    const otra = await talento("Mirona E2E", true, true);

    await login(page, visible.email);
    await page.goto("/perfil");
    await expect(page.getByText("30 años · Palermo")).toBeVisible({ timeout: 15_000 });

    await page.context().clearCookies();
    await login(page, otra.email);
    await page.goto(`/talentos/${visible.id}`);
    await expect(page.getByText("30 años · Palermo")).toBeVisible({ timeout: 15_000 });
  });
});
