import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Enlace público sin chat de dos personas (#283, 0095/0097): sin cuenta se ve la vidriera
 * sin redes y «Crear cuenta»; con cuenta completa se ve el perfil con sus redes, y no hay
 * «Contactar» en ningún caso.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
const INSTAGRAM = "https://instagram.com/redes.e2e";

test.describe("redes en el enlace público", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );
  test.setTimeout(90_000);

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function cuenta(nombre: string, opciones: { redes?: Record<string, string>; enlace?: boolean } = {}) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
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
        enlace_publico_activo: !!opciones.enlace,
      })
      .eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id,
      nombre,
      fecha_nacimiento: "1990-01-01",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo",
      ubicacion_lat: -34.58,
      ubicacion_lng: -58.42,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      onboarding_visto_en: ahora,
      redes: opciones.redes ?? {},
    });
    if (e2) throw e2;
    const { data: p } = await admin!.from("perfiles").select("enlace_token").eq("id", id).single();
    return { id, email, token: p!.enlace_token as string };
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

  test("sin cuenta, sin redes y «Crear cuenta»; con cuenta completa, con redes", async ({ page, browser }) => {
    const ana = await cuenta("Ana Redes E2E", { redes: { instagram: INSTAGRAM }, enlace: true });
    const beto = await cuenta("Beto Mirón E2E");

    const anonimo = await browser.newPage();
    await anonimo.goto(`/p/${ana.token}`);
    await expect(anonimo.getByRole("heading", { name: "Ana Redes E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(anonimo.locator(`a[href="${INSTAGRAM}"]`)).toHaveCount(0);
    await expect(anonimo.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
    await expect(anonimo.getByRole("button", { name: /Contactar/ })).toHaveCount(0);
    await anonimo.close();

    await login(page, beto.email);
    await page.goto(`/p/${ana.token}`);
    await expect(page.getByRole("heading", { name: "Ana Redes E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`a[href="${INSTAGRAM}"]`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Contactar/ })).toHaveCount(0);
  });
});
