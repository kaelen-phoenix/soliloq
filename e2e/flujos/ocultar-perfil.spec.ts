import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * «Ocultar mi perfil a personas nuevas» (#265): se tilda para ocultarse (antes se
 * destildaba «Aparecer en el buscador»), queda guardado, y el perfil propio avisa que está
 * oculto y no ofrece el enlace para compartir (que ya no mostraría nada). Qué oculta la
 * base —buscador, «Armar equipo», enlace, contactos— lo cubre `supabase/tests/ocultar_perfil.sql`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("ocultar el perfil a personas nuevas", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );
  test.setTimeout(90_000);

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function talento(nombre: string) {
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
      fecha_nacimiento: "1990-01-01",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo",
      ubicacion_lat: -34.58,
      ubicacion_lng: -58.42,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      onboarding_visto_en: ahora,
    });
    if (e2) throw e2;
    return { id, email };
  }

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  async function visible(id: string) {
    const { data } = await admin!.from("perfiles_talento").select("aparece_en_buscador").eq("id", id).single();
    return data?.aparece_en_buscador;
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  test("se tilda para ocultarse, y se destilda para volver a mostrarse", async ({ page }) => {
    const cuenta = await talento("Oculta E2E");
    await login(page, cuenta.email);

    // Por defecto, visible: la casilla arranca sin tildar y se puede compartir el perfil.
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Compartir mi perfil" })).toBeVisible({ timeout: 15_000 });
    await page.goto("/perfil?editar=1");
    const casilla = page.getByRole("checkbox", { name: /Ocultar mi perfil a personas nuevas/ });
    await expect(casilla).not.toBeChecked();

    // Tildar = ocultarse.
    await casilla.check();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(() => visible(cuenta.id), { timeout: 15_000 }).toBe(false);

    await page.goto("/perfil");
    await expect(page.getByText("Tu perfil está oculto a personas nuevas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Compartir mi perfil" })).toHaveCount(0);

    // Destildar = volver a mostrarse.
    await page.goto("/perfil?editar=1");
    await expect(casilla).toBeChecked();
    await casilla.uncheck();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(() => visible(cuenta.id), { timeout: 15_000 }).toBe(true);
  });
});
