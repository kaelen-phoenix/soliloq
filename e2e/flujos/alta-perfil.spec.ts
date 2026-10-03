import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Alta del perfil (#300–#302): varias fotos de una, lo opcional plegado, y lo cargado no se
 * pierde si la página se recarga (en celulares viejos, salir a otra app la cierra).
 * La ubicación (Google Places) no se automatiza: el test no llega a completar el alta.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
// PNG 1×1.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("alta del perfil (UI)", () => {
  test.skip(!URL || !KEY, "requiere E2E_SUPABASE_URL y E2E_SERVICE_KEY (staging)");
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    // Las fotos subidas por la UI van a `<uid>/…`, fuera de la carpeta `e2e/` que limpia
    // `borrarUsuarios`: se borran acá.
    for (const id of usuariosCreados) {
      const { data } = await admin!.storage.from("fotos-perfil").list(id);
      if (data?.length) await admin!.storage.from("fotos-perfil").remove(data.map((a) => `${id}/${a.name}`));
    }
    await borrarUsuarios(admin!, usuariosCreados);
  });

  test("varias fotos de una, opcionales plegados, y recupera lo cargado al recargar", async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error) throw error;
    usuariosCreados.push(data.user.id);
    // Aprobada y con Normas aceptadas, sin Perfil de Talento: cae en /completar-perfil.
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({ aprobado_en: new Date().toISOString(), normas_aceptadas_en: new Date().toISOString() })
      .eq("id", data.user.id);
    if (e1) throw e1;

    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/completar-perfil/, { timeout: 30_000 });

    // Lo opcional arranca plegado.
    await expect(page.getByRole("button", { name: /Sumar más/ })).toBeVisible();
    await expect(page.getByLabel("Experiencia")).toHaveCount(0);

    await page.getByLabel("Nombre completo").fill("Alta E2E");
    await page.getByLabel("Fecha de nacimiento").fill("05051995");
    await page.getByLabel("Género").selectOption({ index: 1 });

    // Tres fotos en una sola elección.
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2, 3].map((n) => ({ name: `foto${n}.png`, mimeType: "image/png", buffer: PNG })),
    );
    await expect(page.getByText("3/5 fotos")).toBeVisible({ timeout: 30_000 });

    // Se recarga (como si el celular hubiera cerrado la página): vuelve todo.
    await page.reload();
    await expect(page.getByText("Recuperamos lo que habías cargado")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Nombre completo")).toHaveValue("Alta E2E");
    await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("05/05/1995");
    await expect(page.getByText("3/5 fotos")).toBeVisible();

    // «Sumar más» despliega lo opcional.
    await page.getByRole("button", { name: /Sumar más/ }).click();
    await expect(page.getByLabel("Experiencia")).toBeVisible();
  });
});
