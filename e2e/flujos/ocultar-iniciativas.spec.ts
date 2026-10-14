import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Quitar de la lista las iniciativas cerradas (#413, 0115): solo las cerradas tienen la «X», se
 * confirma antes, no se borra nada y se pueden volver a mostrar desde «Ver ocultas».
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("ocultar iniciativas cerradas (UI)", () => {
  test.skip(!URL || !KEY, "requiere E2E_SUPABASE_URL y E2E_SERVICE_KEY (staging)");
  test.setTimeout(90_000);
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuarios);
  });

  test("quita una cerrada con confirmación y la vuelve a mostrar", async ({ page }) => {
    const s = Date.now();
    const email = `e2e-${s}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error) throw error;
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    await admin!.from("perfiles").update({
      aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora,
    }).eq("id", id);
    await admin!.from("perfiles_talento").insert({
      id, nombre: `Creadora Ocultar ${s}`, fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
      genero: "sin_especificar", onboarding_visto_en: ahora,
    });
    const ubicacion = { ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR" };
    const { error: e1 } = await admin!.from("obras").insert([
      { creador_id: id, titulo: `Cerrada ${s}`, estado: "cerrada", ...ubicacion },
      { creador_id: id, titulo: `Publicada ${s}`, estado: "publicada", ...ubicacion },
    ]);
    if (e1) throw e1;

    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
    await page.goto("/proyectos");

    const cerrada = page.locator("li", { hasText: `Cerrada ${s}` });
    const publicada = page.locator("li", { hasText: `Publicada ${s}` });
    await expect(cerrada).toBeVisible({ timeout: 15_000 });
    // Solo la cerrada tiene la opción.
    await expect(publicada.getByRole("button", { name: "Quitar de la lista" })).toHaveCount(0);

    // Cancelar no cambia nada.
    await cerrada.getByRole("button", { name: "Quitar de la lista" }).click();
    await expect(page.getByText(`¿Quitás «Cerrada ${s}» de tu lista?`)).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(cerrada).toBeVisible();

    // Confirmar la quita de la lista, sin recargar a mano.
    await cerrada.getByRole("button", { name: "Quitar de la lista" }).click();
    await page.getByRole("button", { name: "Quitar", exact: true }).click();
    await expect(page.locator("li", { hasText: `Cerrada ${s}` })).toHaveCount(0, { timeout: 15_000 });
    await expect(publicada).toBeVisible();
    const { data: fila } = await admin!.from("obras").select("oculta_en").eq("titulo", `Cerrada ${s}`).single();
    expect(fila?.oculta_en).not.toBeNull();

    // Se puede volver a mostrar.
    await page.getByRole("button", { name: "Ver ocultas (1)" }).click();
    await page.getByRole("button", { name: "Volver a mostrar" }).click();
    await expect(page.getByRole("button", { name: /Ver ocultas/ })).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("li", { hasText: `Cerrada ${s}` }).getByRole("button", { name: "Quitar de la lista" })).toBeVisible();
  });
});
