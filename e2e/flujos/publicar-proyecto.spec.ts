import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Publicar un Proyecto (#329): sin foto avisa; al subir una foto el aviso se va y «Publicar»
 * funciona sin salir de la pantalla (antes contaba las fotos con que se cargó la página y
 * había que salir y volver a entrar).
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("publicar proyecto (UI)", () => {
  test.skip(!URL || !KEY, "requiere E2E_SUPABASE_URL y E2E_SERVICE_KEY (staging)");
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    for (const id of usuarios) {
      const { data } = await admin!.storage.from("fotos-perfil").list(id);
      if (data?.length) await admin!.storage.from("fotos-perfil").remove(data.map((a) => `${id}/${a.name}`));
    }
    await borrarUsuarios(admin!, usuarios);
  });

  test("sin foto avisa; con la foto recién subida publica sin recargar", async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error) throw error;
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    await admin!.from("perfiles").update({
      aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora,
    }).eq("id", id);
    await admin!.from("perfiles_talento").insert({
      id, nombre: "Publica E2E", fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
      genero: "sin_especificar", onboarding_visto_en: ahora,
    });
    const { data: obra, error: e2 } = await admin!.from("obras").insert({
      creador_id: id, titulo: "Obra para publicar E2E", estado: "borrador",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    if (e2) throw e2;
    await admin!.from("roles").insert({ obra_id: obra.id, nombre: "Protagonista", tipo: "actuacion", vacantes: 1 });

    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });

    await page.goto(`/obras/${obra.id}`);
    await page.getByRole("button", { name: "Publicar convocatoria" }).click();
    await expect(page.getByText("Subí al menos una foto antes de publicar.")).toBeVisible({ timeout: 10_000 });

    await page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Subí al menos una foto antes de publicar.")).toHaveCount(0, { timeout: 15_000 });

    await page.getByRole("button", { name: "Publicar convocatoria" }).click();
    await expect(page.getByRole("button", { name: "Cerrar convocatoria" })).toBeVisible({ timeout: 15_000 });
    const { data: fila } = await admin!.from("obras").select("estado").eq("id", obra.id).single();
    expect(fila?.estado).toBe("publicada");
  });
});
