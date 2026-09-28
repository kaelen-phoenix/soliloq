import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Notificaciones push de punta a punta (#232): el receptor activa las notificaciones en
 * Ajustes, sale de la app, otra persona le escribe en la sala y la notificación llega a su
 * service worker con título, texto y la URL de la sala.
 *
 * **Solo local**, con Google Chrome instalado: el Chromium de Playwright no trae servicio de
 * push (la suscripción falla), y en CI no hay Chrome con push. Por eso vive fuera de
 * `flujos/` (CI corre `e2e/publico.spec.ts` y `e2e/flujos`) y se saltea sin
 * `E2E_PUSH_CHROME=1`. Cómo correrlo: ver `e2e/README.md`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const BASE = process.env.E2E_BASE_URL;
const PASS = "test-1234-abcd";

test.describe("push de punta a punta (Chrome real, local)", () => {
  test.skip(
    process.env.E2E_PUSH_CHROME !== "1" || !URL || !KEY || !BASE,
    "solo local: E2E_PUSH_CHROME=1 + staging (E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL) y la app levantada con claves VAPID",
  );
  test.setTimeout(120_000);

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

  async function nuevoUsuario(nombre: string) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    const id = data.user.id;
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
      onboarding_visto_en: new Date().toISOString(),
    });
    if (e2) throw e2;
    return { id, email };
  }

  async function login(page: Page, email: string) {
    await page.goto(`${BASE}/ingresar`);
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  test("activar notificaciones → otra persona escribe → llega la notificación de la sala", async ({
    page,
  }) => {
    const ids: string[] = [];
    let salaId: string | null = null;
    let chrome: BrowserContext | null = null;
    const perfilChrome = fs.mkdtempSync(path.join(os.tmpdir(), "push-chrome-"));
    try {
      const autor = await nuevoUsuario("Autor Push E2E");
      const receptor = await nuevoUsuario("Receptor Push E2E");
      ids.push(autor.id, receptor.id);
      const { data: sala, error: eSala } = await admin!
        .from("salas")
        .insert({ titulo: "Sala push E2E" })
        .select("id")
        .single();
      if (eSala) throw eSala;
      salaId = sala.id;
      const { error: eInt } = await admin!.from("sala_integrantes").insert([
        { sala_id: sala.id, perfil_id: autor.id },
        { sala_id: sala.id, perfil_id: receptor.id },
      ]);
      if (eInt) throw eInt;

      // Receptor en Chrome real, con perfil propio y el permiso ya concedido.
      chrome = await chromium.launchPersistentContext(perfilChrome, {
        channel: "chrome",
        headless: false,
      });
      await chrome.grantPermissions(["notifications"], { origin: BASE! });
      const receptorPage = chrome.pages()[0] ?? (await chrome.newPage());
      await login(receptorPage, receptor.email);
      await receptorPage.goto(`${BASE}/ajustes`);
      await receptorPage.getByRole("button", { name: "Activar notificaciones" }).click();
      await expect(
        receptorPage.getByRole("button", { name: "Desactivar notificaciones" }),
      ).toBeVisible({ timeout: 30_000 });
      const { data: subs } = await admin!
        .from("push_suscripciones")
        .select("endpoint")
        .eq("perfil_id", receptor.id);
      expect(subs, "la suscripción tiene que quedar guardada").toHaveLength(1);

      // Sale de la app: la notificación tiene que llegar igual, por el service worker.
      await receptorPage.goto("about:blank");

      // Autor: el navegador del test (Chromium de Playwright alcanza para escribir).
      const texto = `Mensaje push E2E ${Date.now()}`;
      await login(page, autor.email);
      await page.goto(`${BASE}/salas/${sala.id}`);
      await page.getByPlaceholder("Escribí un mensaje…").fill(texto);
      await page.getByRole("button", { name: "Enviar" }).click();
      await expect(page.getByText(texto)).toBeVisible();

      // ¿Llegó? Se le pregunta al service worker del receptor.
      const verificador = await chrome.newPage();
      await verificador.goto(`${BASE}/bienvenida`);
      await expect
        .poll(
          () =>
            verificador.evaluate(async () => {
              const registro = await navigator.serviceWorker.ready;
              return (await registro.getNotifications()).map((n) => ({
                title: n.title,
                body: n.body,
                url: (n.data as { url?: string } | null)?.url ?? null,
              }));
            }),
          { timeout: 45_000, intervals: [1_000] },
        )
        .toContainEqual({
          title: "Autor Push E2E — Sala push E2E",
          body: texto,
          url: `/salas/${sala.id}`,
        });
    } finally {
      if (chrome) await chrome.close();
      if (salaId) await admin!.from("salas").delete().eq("id", salaId);
      for (const id of ids) await admin!.auth.admin.deleteUser(id);
      fs.rmSync(perfilChrome, { recursive: true, force: true });
    }
  });
});
