import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Compartir el perfil completo (#384, 0113): sin cuenta se ve la vidriera con las redes y la
 * invitación «Creá tu perfil en Yalope»; el enlace anda con el código o con el nombre elegido
 * (`/p/ana-perez`), y cada apertura de otra persona suma al contador del dueño. Sigue sin
 * haber «Contactar» (#283).
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
const INSTAGRAM = "https://instagram.com/redes.e2e";

test.describe("perfil compartido", () => {
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

  async function visitas(id: string) {
    const { data } = await admin!.from("visitas_enlace").select("cantidad").eq("perfil_id", id);
    return (data ?? []).reduce((suma, v) => suma + (v.cantidad as number), 0);
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  test("sin cuenta se ve con redes y la invitación, y la visita se cuenta", async ({ page, browser }) => {
    const ana = await cuenta("Ana Redes E2E", { redes: { instagram: INSTAGRAM }, enlace: true });
    const beto = await cuenta("Beto Mirón E2E");

    const anonimo = await browser.newPage();
    await anonimo.goto(`/p/${ana.token}`);
    await expect(anonimo.getByRole("heading", { name: "Ana Redes E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(anonimo.locator(`a[href="${INSTAGRAM}"]`)).toBeVisible();
    await expect(anonimo.getByRole("link", { name: "Creá tu perfil en Yalope" })).toBeVisible();
    await expect(anonimo.getByRole("button", { name: /Contactar/ })).toHaveCount(0);
    await expect.poll(() => visitas(ana.id), { timeout: 15_000 }).toBe(1);
    // Recargar la misma pestaña no suma otra.
    await anonimo.reload();
    await expect(anonimo.getByRole("heading", { name: "Ana Redes E2E" })).toBeVisible({ timeout: 15_000 });
    await anonimo.close();

    await login(page, beto.email);
    await page.goto(`/p/${ana.token}`);
    await expect(page.getByRole("heading", { name: "Ana Redes E2E" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`a[href="${INSTAGRAM}"]`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Creá tu perfil en Yalope" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Contactar/ })).toHaveCount(0);
    await expect.poll(() => visitas(ana.id), { timeout: 15_000 }).toBe(2);
  });

  test("el dueño elige el nombre del enlace y ve cuántas veces se abrió", async ({ page, browser }) => {
    const ana = await cuenta("Ana Alias E2E", { enlace: true });
    const alias = `ana-e2e-${Math.random().toString(36).slice(2, 8)}`;

    await login(page, ana.email);
    await page.goto("/perfil");
    const campo = page.locator("#enlace-alias");
    await expect(campo).toBeVisible({ timeout: 15_000 });
    // Sugiere uno a partir del nombre.
    await expect(campo).toHaveValue("ana-alias-e2e");

    await campo.fill("Con Espacios");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText(/Usá de 3 a 40 letras minúsculas/)).toBeVisible();

    await campo.fill(alias);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Listo: ya podés compartir tu enlace con este nombre.")).toBeVisible();

    // Las visitas del propio dueño no cuentan.
    await page.goto(`/p/${alias}`);
    await expect(page.getByRole("heading", { name: "Ana Alias E2E" })).toBeVisible({ timeout: 15_000 });

    const anonimo = await browser.newPage();
    await anonimo.goto(`/p/${alias.toUpperCase()}`);
    await expect(anonimo.getByRole("heading", { name: "Ana Alias E2E" })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => visitas(ana.id), { timeout: 15_000 }).toBe(1);
    // El enlace con código sigue andando.
    await anonimo.goto(`/p/${ana.token}`);
    await expect(anonimo.getByRole("heading", { name: "Ana Alias E2E" })).toBeVisible({ timeout: 15_000 });
    await anonimo.close();

    await page.goto("/perfil");
    await expect(page.getByText(/Tu enlace se abrió (una vez|\d+ veces) en los últimos 30 días/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
