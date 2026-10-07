import { test, type Page, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Accesibilidad (#345): corre axe-core en cada pantalla (anónima y con sesión) y anota los
 * problemas serios y críticos (contraste, campos sin etiqueta, botones sin nombre…) en
 * `E2E_RECORRIDO_DIR/accesibilidad.txt`. Si una pantalla no se puede revisar, sigue con las
 * demás y al final falla.
 *
 *   E2E_A11Y=1 E2E_RECORRIDO_DIR=/tmp/a11y npx playwright test e2e/local/accesibilidad.spec.ts
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const DIR = process.env.E2E_RECORRIDO_DIR ?? "accesibilidad";
const PASS = "test-1234-abcd";
// axe-core es devDependency: se inyecta desde node_modules, sin depender de un CDN.
const AXE = require.resolve("axe-core/axe.min.js");

test.describe("accesibilidad", () => {
  test.skip(process.env.E2E_A11Y !== "1" || !URL || !KEY, "solo a mano: E2E_A11Y=1 + staging");
  test.setTimeout(600_000);
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];
  const informe: string[] = [];
  const fallas: string[] = [];
  // #356: corre en el CI, así que una violación seria o crítica hace fallar el test.
  const conViolaciones: string[] = [];

  test.afterAll(async () => {
    // El informe primero: si la limpieza falla, igual queda escrito.
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, "accesibilidad.txt"), informe.join("\n"));
    if (admin) await borrarUsuarios(admin, usuarios);
  });

  async function revisar(page: Page, nombre: string) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);
    await page.addScriptTag({ path: AXE });
    const r = await page.evaluate(async () => {
      // @ts-expect-error axe llega por <script>
      const res = await window.axe.run(document, { resultTypes: ["violations"] });
      return res.violations
        .filter((v: { impact: string }) => v.impact === "serious" || v.impact === "critical")
        .map((v: { id: string; impact: string; help: string; nodes: { target: string[] }[] }) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          n: v.nodes.length,
          ejemplos: v.nodes.slice(0, 3).map((x) => x.target.join(" ")),
        }));
    });
    informe.push(r.length ? `${nombre}:` : `${nombre}: OK`);
    if (r.length) conViolaciones.push(nombre);
    for (const v of r) informe.push(`  [${v.impact}] ${v.id} ×${v.n} — ${v.help}\n      ${v.ejemplos.join("\n      ")}`);
  }

  /** Abre una ruta y la revisa; si falla, la anota y sigue con las demás. */
  async function visitar(page: Page, nombre: string, abrir: () => Promise<unknown>) {
    try {
      await abrir();
      await revisar(page, nombre);
    } catch (e) {
      fallas.push(`${nombre}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      informe.push(`${nombre}: NO SE PUDO REVISAR`);
    }
  }

  async function cuenta() {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("sin usuario");
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({ aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora })
      .eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id, nombre: "Accesible E2E", fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
      genero: "sin_especificar", onboarding_visto_en: ahora, experiencia: "Teatro independiente.",
    });
    if (e2) throw e2;
    const { data: obra, error: e3 } = await admin!.from("obras").insert({
      creador_id: id, titulo: "Obra accesible", estado: "borrador",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    if (e3) throw e3;
    const { data: equipo, error: e4 } = await admin!
      .from("equipos")
      .insert({ creador_id: id, titulo: "Equipo accesible", cupo: null })
      .select("id")
      .single();
    if (e4) throw e4;
    return { email, obraId: obra.id as string, equipoId: equipo.id as string };
  }

  async function entrar(browser: Browser, email: string) {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
    return page;
  }

  test("todas las pantallas", async ({ browser }) => {
    const anon = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    for (const ruta of ["/bienvenida", "/ingresar", "/recuperar", "/normas", "/apoyar", "/privacidad", "/terminos", "/en/bienvenida"]) {
      await visitar(anon, ruta, () => anon.goto(ruta));
    }

    const { email, obraId, equipoId } = await cuenta();
    const p = await entrar(browser, email);
    for (const ruta of [
      "/",
      "/salas",
      "/matches",
      "/perfil",
      "/perfil?editar=1",
      `/obras/${obraId}`,
      `/equipos/${equipoId}`,
      `/talentos?obra=${obraId}`,
      "/notificaciones",
      "/ajustes",
    ]) {
      await visitar(p, ruta, () => p.goto(ruta));
    }
    await visitar(p, "/proyectos (¿Qué querés armar?)", async () => {
      await p.goto("/proyectos");
      await p.getByRole("button", { name: "Crear proyecto" }).click();
    });

    console.log(informe.join("\n"));
    if (fallas.length) throw new Error(`No se pudieron revisar: ${fallas.join(" | ")}`);
    if (conViolaciones.length) {
      throw new Error(`Violaciones serias o críticas de accesibilidad en: ${conViolaciones.join(", ")}`);
    }
  });
});
