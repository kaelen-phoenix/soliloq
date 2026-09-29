import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Los chequeos de acceso del middleware y del layout de `(app)`, uno por caso de cuenta
 * (#237: el middleware pasó a validar la sesión con `getClaims()` y a saltear el estado de
 * la cuenta en las navegaciones internas de la app). Cada caso entra con carga completa,
 * que es donde se decide; el último además navega por dentro.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("accesos según el estado de la cuenta", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function cuenta(estado: {
    aprobado?: boolean;
    normas?: boolean;
    perfilTalento?: boolean;
    suspendido?: boolean;
  }) {
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
        aprobado_en: estado.aprobado === false ? null : ahora,
        normas_aceptadas_en: estado.normas === false ? null : ahora,
        suspendido_en: estado.suspendido ? ahora : null,
        modo_activo: estado.perfilTalento === false ? null : "talento",
        tour_talento_visto_en: ahora,
        tour_creador_visto_en: ahora,
      })
      .eq("id", id);
    if (e1) throw e1;
    if (estado.perfilTalento !== false) {
      const { error: e2 } = await admin!.from("perfiles_talento").insert({
        id,
        nombre: "Acceso E2E",
        fecha_nacimiento: "1995-01-01",
        ubicacion_texto: "Buenos Aires, Argentina",
        ubicacion_publica: "Buenos Aires",
        ubicacion_lat: -34.6037,
        ubicacion_lng: -58.3816,
        ubicacion_pais: "AR",
        genero: "sin_especificar",
        onboarding_visto_en: ahora,
      });
      if (e2) throw e2;
    }
    return { id, email };
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

  test("sin sesión, una pantalla de la app no se abre", async ({ page }) => {
    await page.goto("/salas");
    await expect(page).not.toHaveURL(/\/salas/);
  });

  test("sin aprobar → /solicitud-pendiente, y guarda a dónde iba", async ({ page }) => {
    const c = await cuenta({ aprobado: false });
    await login(page, c.email);
    await page.goto("/salas");
    await expect(page).toHaveURL(/\/solicitud-pendiente\?next=%2Fsalas/);
  });

  test("sin aceptar las Normas → /aceptar-normas", async ({ page }) => {
    const c = await cuenta({ normas: false });
    await login(page, c.email);
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/aceptar-normas\?next=%2Fperfil/);
  });

  test("sin Perfil de Talento → /completar-perfil", async ({ page }) => {
    const c = await cuenta({ perfilTalento: false });
    await login(page, c.email);
    await page.goto("/salas");
    await expect(page).toHaveURL(/\/completar-perfil/);
  });

  test("suspendida → /suspendido", async ({ page }) => {
    const c = await cuenta({ suspendido: true });
    await login(page, c.email);
    await page.goto("/salas");
    await expect(page).toHaveURL(/\/suspendido/);
  });

  test("cuenta completa: entra y navega por dentro de la app", async ({ page }) => {
    const c = await cuenta({});
    await login(page, c.email);
    await page.goto("/");
    await expect(page).toHaveURL((u) => u.pathname === "/");
    // Navegaciones internas (sin recarga): el middleware ya no re-lee el estado de la cuenta.
    await page.getByRole("link", { name: "Chats" }).first().click();
    await expect(page).toHaveURL(/\/salas$/);
    await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Perfil" }).first().click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "Tu perfil" })).toBeVisible({ timeout: 15_000 });
  });
});
