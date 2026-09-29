import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Tope del formulario de contacto de «Apoyar» (#252, 0087): con 3 mensajes del mismo email
 * en la última hora, el 4.º se rechaza y el formulario lo explica (en vez del error
 * genérico de «probá de nuevo», que invitaría a reintentar).
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;

test.describe("formulario de contacto con tope por hora", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const email = `e2e-contacto-${Date.now()}@test.local`;

  test.afterAll(async () => {
    await admin!.from("mensajes_contacto").delete().eq("email", email);
  });

  test("el 4.º mensaje de la hora muestra el aviso del tope", async ({ page }) => {
    const { error } = await admin!.from("mensajes_contacto").insert(
      [1, 2, 3].map((i) => ({ nombre: "E2E", email, tipo: "otro", mensaje: `previo ${i}` })),
    );
    if (error) throw error;

    await page.goto("/apoyar");
    await page.getByLabel("Nombre").fill("E2E");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mensaje").fill("uno más");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "varios mensajes tuyos en la última hora" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});
