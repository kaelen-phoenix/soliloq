import { test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * La app en inglés (#354): recorre cada pantalla, anónima y con sesión, con `NEXT_LOCALE=en`,
 * y falla si en el texto visible aparecen palabras que solo existen en castellano. Los datos
 * de la cuenta de prueba se cargan en inglés para que no cuenten.
 *
 *   E2E_INGLES=1 npx playwright test e2e/local/ingles.spec.ts
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

// Palabras frecuentes del castellano que no son inglés. Sin tildes sueltas: los nombres de
// lugar («Córdoba») son datos, no texto de la interfaz.
const CASTELLANO =
  /\b(el|los|las|del|para|con|una|que|tu|tus|sin|por|más|está|querés|tenés|podés|acá|todavía|también|ningún|ninguna|guardar|buscar|cerrar|volver|probá|elegí|escribí|tocá)\b|[¿¡]/i;

test.describe("la app en inglés", () => {
  test.skip(process.env.E2E_INGLES !== "1" || !URL || !KEY, "solo con E2E_INGLES=1 + staging");
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
    await admin!
      .from("perfiles")
      .update({ aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora, idioma: "en" })
      .eq("id", id);
    await admin!.from("perfiles_talento").insert({
      id, nombre: "English Tester", fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
      genero: "sin_especificar", onboarding_visto_en: ahora, experiencia: "Independent theater.",
    });
    const { data: obra } = await admin!.from("obras").insert({
      creador_id: id, titulo: "English play", estado: "borrador",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    const { data: equipo } = await admin!.from("equipos").insert({ creador_id: id, titulo: "English team", cupo: null }).select("id").single();
    return { email, obraId: obra!.id as string, equipoId: equipo!.id as string };
  }

  async function nueva(browser: Browser): Promise<Page> {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US" });
    await ctx.addCookies([{ name: "NEXT_LOCALE", value: "en", url: process.env.E2E_BASE_URL ?? "http://localhost:3100" }]);
    const page = await ctx.newPage();
    // next-intl avisa por consola las claves que faltan o no se pueden formatear.
    page.on("console", (m) => {
      if (/MISSING_MESSAGE|FORMATTING_ERROR|INVALID_MESSAGE/.test(m.text())) erroresIntl.push(m.text().slice(0, 200));
    });
    return page;
  }

  const erroresIntl: string[] = [];

  test("ninguna pantalla muestra castellano", async ({ browser }) => {
    const hallazgos: string[] = [];
    async function revisar(page: Page, nombre: string) {
      await page.waitForLoadState("networkidle").catch(() => {});
      const texto = await page.evaluate(() => {
        const partes = [document.body.innerText];
        for (const el of document.querySelectorAll("[aria-label],[placeholder],[title],img[alt]")) {
          for (const a of ["aria-label", "placeholder", "title", "alt"]) {
            const v = el.getAttribute(a);
            if (v) partes.push(v);
          }
        }
        return partes.join("\n");
      });
      const lineas = texto.split("\n").filter((l) => CASTELLANO.test(l));
      if (lineas.length) hallazgos.push(`${nombre}:\n    ${[...new Set(lineas)].slice(0, 6).join("\n    ")}`);
    }

    const anon = await nueva(browser);
    for (const ruta of ["/bienvenida", "/ingresar", "/recuperar", "/normas", "/apoyar", "/privacidad", "/terminos"]) {
      await anon.goto(ruta);
      await revisar(anon, ruta);
    }

    const { email, obraId, equipoId } = await cuenta();
    const p = await nueva(browser);
    await p.goto("/ingresar");
    await p.getByLabel("Your email").fill(email);
    await p.getByLabel("Password").fill(PASS);
    await p.locator("form").getByRole("button", { name: "Sign in" }).click();
    await p.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
    for (const ruta of [
      "/",
      "/salas",
      "/matches",
      "/proyectos",
      "/perfil",
      "/perfil?editar=1",
      `/obras/${obraId}`,
      `/equipos/${equipoId}`,
      `/talentos?obra=${obraId}`,
      "/notificaciones",
      "/ajustes",
    ]) {
      await p.goto(ruta);
      await revisar(p, ruta);
    }

    console.log(hallazgos.join("\n") || "Todo en inglés.");
    if (hallazgos.length) throw new Error(`Texto en castellano en la versión en inglés:\n${hallazgos.join("\n")}`);
    if (erroresIntl.length) throw new Error(`Errores de traducción:\n${[...new Set(erroresIntl)].join("\n")}`);
  });
});
