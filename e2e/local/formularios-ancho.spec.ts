import { test, type Page, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Formularios en celulares angostos (#328): abre cada formulario (crear proyecto y equipo,
 * editar proyecto, rol, filtros de búsqueda, perfil, ajustes) a 320 y 360 px de ancho, guarda
 * una captura y lista todo elemento que se sale por la derecha. Falla si alguno se sale.
 *
 *   E2E_FORMULARIOS=1 E2E_RECORRIDO_DIR=/tmp/f npx playwright test e2e/local/formularios-ancho.spec.ts
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const DIR = process.env.E2E_RECORRIDO_DIR ?? "formularios-ancho";
const PASS = "test-1234-abcd";

test.describe("formularios en pantallas angostas", () => {
  test.skip(process.env.E2E_FORMULARIOS !== "1" || !URL || !KEY, "solo a mano: E2E_FORMULARIOS=1 + staging");
  test.setTimeout(600_000);
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.afterAll(async () => {
    if (admin) await borrarUsuarios(admin, usuarios);
  });

  async function cuenta() {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("sin usuario");
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    await admin!.from("perfiles").update({
      aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora,
    }).eq("id", id);
    await admin!.from("perfiles_talento").insert({
      id, nombre: "Ancho E2E", fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
      genero: "sin_especificar", onboarding_visto_en: ahora,
    });
    const { data: obra } = await admin!.from("obras").insert({
      creador_id: id, titulo: "Obra con un título bastante largo para ver cómo corta", estado: "borrador",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    return { email, obraId: obra!.id as string };
  }

  async function entrar(browser: Browser, email: string, ancho: number) {
    const page = await (await browser.newContext({ viewport: { width: ancho, height: 760 } })).newPage();
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
    return page;
  }

  async function revisar(page: Page, nombre: string, ancho: number, informe: string[], fallas: string[]) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);
    const fuera = await page.evaluate((w) => {
      const salidos: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("main *, form *"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > w + 1 || r.left < -1) {
          const id = el.id ? `#${el.id}` : "";
          const txt = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.textContent || "").trim().slice(0, 40);
          salidos.push(`${el.tagName.toLowerCase()}${id} [${Math.round(r.left)}→${Math.round(r.right)}] ${txt}`);
        }
      }
      return { salidos: salidos.slice(0, 12), scroll: document.documentElement.scrollWidth };
    }, ancho);
    const ok = fuera.salidos.length === 0 && fuera.scroll <= ancho;
    const separador = "\n    ";
    informe.push(`${ancho}px ${nombre}: scrollWidth=${fuera.scroll}` + (ok ? " OK" : separador + fuera.salidos.join(separador)));
    if (!ok) fallas.push(`${ancho}px ${nombre}`);
    fs.mkdirSync(DIR, { recursive: true });
    await page.screenshot({ path: path.join(DIR, `${ancho}-${nombre}.png`), fullPage: true });
  }

  test("formularios", async ({ browser }) => {
    const { email, obraId } = await cuenta();
    const informe: string[] = [];
    const fallas: string[] = [];
    for (const ancho of [320, 360]) {
      const page = await entrar(browser, email, ancho);

      await page.goto("/proyectos");
      await page.getByRole("button", { name: "Crear proyecto" }).click();
      await page.getByRole("button", { name: /Un proyecto con roles/ }).click();
      await revisar(page, "crear-proyecto", ancho, informe, fallas);

      await page.goto("/proyectos");
      await page.getByRole("button", { name: "Crear proyecto" }).click();
      await page.getByRole("button", { name: /Armar equipo/ }).click();
      await revisar(page, "crear-equipo", ancho, informe, fallas);

      await page.goto(`/obras/${obraId}`);
      await revisar(page, "proyecto", ancho, informe, fallas);
      await page.goto(`/obras/${obraId}?editar=1`);
      await revisar(page, "editar-proyecto", ancho, informe, fallas);

      await page.goto(`/talentos?obra=${obraId}`);
      await page.getByRole("button", { name: /^Filtros/ }).click();
      await revisar(page, "buscar-filtros", ancho, informe, fallas);

      await page.goto("/perfil?editar=1");
      // Al editar, lo opcional ya está desplegado (el «Sumar más» es solo del alta).
      await revisar(page, "perfil-editar", ancho, informe, fallas);

      await page.goto("/ajustes");
      await revisar(page, "ajustes", ancho, informe, fallas);
      await page.context().close();
    }
    fs.writeFileSync(path.join(DIR, "informe.txt"), informe.join("\n"));
    console.log(informe.join("\n"));
    if (fallas.length) throw new Error(`Se sale de la pantalla en: ${fallas.join(", ")}`);
  });
});
