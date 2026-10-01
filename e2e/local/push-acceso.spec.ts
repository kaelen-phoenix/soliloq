import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Avisos de acceso por push, de punta a punta (#247, #248, 0092):
 *   1. Un admin tiene las notificaciones activadas.
 *   2. Alguien se registra sin invitación y cae en `/solicitud-pendiente` → al admin le llega
 *      «Nueva solicitud de acceso» con el email de esa persona.
 *   3. La persona toca «Avisame cuando me habiliten» y sale de la app.
 *   4. El admin la habilita desde el panel → a la persona le llega «¡Ya tenés acceso a
 *      Yalope!».
 *
 * **Solo local**, con Google Chrome, igual que `push-chrome.spec.ts` (el Chromium de
 * Playwright no trae servicio de push). Dos Chrome, cada uno con su perfil: cada cuenta
 * necesita su propia suscripción. Cómo correrlo: ver `e2e/README.md`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const BASE = process.env.E2E_BASE_URL;
const PASS = "test-1234-abcd";

test.describe("avisos de acceso por push (Chrome real, local)", () => {
  test.skip(
    process.env.E2E_PUSH_CHROME !== "1" ||
      !URL ||
      !KEY ||
      !BASE ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY ||
      !process.env.VAPID_SUBJECT,
    "solo local: E2E_PUSH_CHROME=1 + staging (E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL) + las claves VAPID con las que se levantó la app",
  );
  test.setTimeout(180_000);

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

  async function crearCuenta(nombre: string) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    return { id: data.user.id, email, nombre };
  }

  /** Cuenta admin completa: aprobada, con Normas, perfil y el tour visto. */
  async function nuevoAdmin(nombre: string) {
    const c = await crearCuenta(nombre);
    const ahora = new Date().toISOString();
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        es_admin: true,
        aprobado_en: ahora,
        normas_aceptadas_en: ahora,
        tour_talento_visto_en: ahora,
        tour_creador_visto_en: ahora,
        modo_activo: "talento",
      })
      .eq("id", c.id);
    if (e1) throw e1;
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id: c.id,
      nombre,
      fecha_nacimiento: "1990-01-01",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Buenos Aires",
      ubicacion_lat: -34.6037,
      ubicacion_lng: -58.3816,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      onboarding_visto_en: ahora,
    });
    if (e2) throw e2;
    // Como toda cuenta de prueba, nace pendiente y se aprueba acá: eso le deja un aviso
    // `acceso_habilitado` propio (0092). Se da por enviado para que no le llegue junto con la
    // solicitud que este test espera.
    const { error: e3 } = await admin!
      .from("notificaciones")
      .update({ push_enviado_en: ahora })
      .eq("destinatario_id", c.id)
      .eq("tipo", "acceso_habilitado");
    if (e3) throw e3;
    return c;
  }

  async function login(page: Page, email: string) {
    await page.goto(`${BASE}/ingresar`);
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  async function chromeCon(perfil: string) {
    const ctx = await chromium.launchPersistentContext(perfil, { channel: "chrome", headless: false });
    await ctx.grantPermissions(["notifications"], { origin: BASE! });
    return ctx;
  }

  /** Lo que recibió el service worker de ese Chrome. */
  async function notificaciones(ctx: BrowserContext) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/bienvenida`);
    const lista = await p.evaluate(async () => {
      const registro = await navigator.serviceWorker.ready;
      return (await registro.getNotifications()).map((n) => ({
        title: n.title,
        body: n.body,
        url: (n.data as { url?: string } | null)?.url ?? null,
      }));
    });
    await p.close();
    return lista;
  }

  test("solicitud → push al admin; habilitar desde el panel → push a la persona", async () => {
    const ids: string[] = [];
    const perfiles = [
      fs.mkdtempSync(path.join(os.tmpdir(), "push-acceso-admin-")),
      fs.mkdtempSync(path.join(os.tmpdir(), "push-acceso-pide-")),
    ];
    let chromeAdmin: BrowserContext | null = null;
    let chromePide: BrowserContext | null = null;
    try {
      // 1. El admin activa las notificaciones.
      const adm = await nuevoAdmin("Admin Acceso E2E");
      ids.push(adm.id);
      chromeAdmin = await chromeCon(perfiles[0]);
      const paginaAdmin = chromeAdmin.pages()[0] ?? (await chromeAdmin.newPage());
      await login(paginaAdmin, adm.email);
      await paginaAdmin.goto(`${BASE}/ajustes`);
      await paginaAdmin.getByRole("button", { name: "Activar notificaciones" }).click();
      await expect(paginaAdmin.getByRole("button", { name: "Desactivar notificaciones" })).toBeVisible({
        timeout: 30_000,
      });
      await paginaAdmin.goto("about:blank");

      // 2. Alguien se registra sin invitación (queda pendiente) y entra.
      const pide = await crearCuenta("Pide Acceso E2E");
      ids.push(pide.id);
      chromePide = await chromeCon(perfiles[1]);
      const paginaPide = chromePide.pages()[0] ?? (await chromePide.newPage());
      await login(paginaPide, pide.email);
      await expect(paginaPide).toHaveURL(/\/solicitud-pendiente/);

      await expect
        .poll(() => notificaciones(chromeAdmin!), { timeout: 45_000, intervals: [1_500] })
        .toContainEqual({
          title: "Nueva solicitud de acceso",
          body: `${pide.email} pidió entrar a Yalope.`,
          url: "/admin",
        });

      // 3. «Avisame cuando me habiliten», y sale de la app.
      await paginaPide.getByRole("button", { name: "Activar notificaciones" }).click();
      await expect(paginaPide.getByRole("button", { name: "Desactivar notificaciones" })).toBeVisible({
        timeout: 30_000,
      });
      await paginaPide.goto("about:blank");

      // 4. El admin la habilita desde el panel.
      await paginaAdmin.goto(`${BASE}/admin`);
      await paginaAdmin.getByRole("button", { name: "acceso", exact: true }).click();
      const fila = paginaAdmin.locator("li", { hasText: pide.email });
      await fila.getByRole("button", { name: "Habilitar" }).click();
      await expect(fila).toHaveCount(0, { timeout: 15_000 });

      await expect
        .poll(() => notificaciones(chromePide!), { timeout: 45_000, intervals: [1_500] })
        .toContainEqual({
          title: "¡Ya tenés acceso a Yalope!",
          body: "Tu solicitud fue aprobada. Entrá y completá tu perfil.",
          url: "/",
        });
    } finally {
      if (chromeAdmin) await chromeAdmin.close();
      if (chromePide) await chromePide.close();
      await borrarUsuarios(admin!, ids);
      for (const p of perfiles) fs.rmSync(p, { recursive: true, force: true });
    }
  });
});
