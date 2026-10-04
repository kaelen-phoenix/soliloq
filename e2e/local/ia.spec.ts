import { test, expect, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Las funciones de IA de punta a punta (#313, #319–#323), contra el modelo real. Gasta usos
 * del tope diario: solo a mano, con la app levantada con `VERCEL_OIDC_TOKEN`.
 *
 *   E2E_IA=1 npx playwright test e2e/local/ia.spec.ts
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("IA en la app", () => {
  test.skip(process.env.E2E_IA !== "1" || !URL || !KEY, "solo a mano: E2E_IA=1 + staging + OIDC");
  test.setTimeout(300_000);
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.afterAll(async () => {
    if (admin) await borrarUsuarios(admin, usuarios);
  });

  async function cuenta(nombre: string, esAdmin = false) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("sin usuario");
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    await admin!.from("perfiles").update({
      aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora, es_admin: esAdmin,
    }).eq("id", id);
    await admin!.from("perfiles_talento").insert({
      id, nombre, fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina", ubicacion_publica: "Palermo",
      ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR", genero: "sin_especificar", onboarding_visto_en: ahora,
    });
    return { id, email };
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

  test("redactar, sugerir habilidades, buscar escribiendo, saludo y revisión", async ({ browser }) => {
    const creadora = await cuenta("Creadora IA");
    const talento = await cuenta("Lucía Talento IA");
    const adm = await cuenta("Admin IA", true);

    // Proyecto con sala y una persona adentro (para el saludo).
    const { data: obra } = await admin!.from("obras").insert({
      creador_id: creadora.id, titulo: "Las tres hermanas IA", estado: "publicada", sinopsis: "Obra sobre tres hermanas.",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    const { data: sala } = await admin!.from("salas").insert({ titulo: "Las tres hermanas IA", obra_id: obra!.id }).select("id").single();
    await admin!.from("sala_integrantes").insert([
      { sala_id: sala!.id, perfil_id: creadora.id },
      { sala_id: sala!.id, perfil_id: talento.id },
    ]);

    const p = await entrar(browser, creadora.email);

    // 1. Mejorar redacción + sugerir habilidades en el perfil.
    await p.goto("/perfil?editar=1");
    const experiencia = p.getByLabel("Experiencia");
    await experiencia.fill("estudie teatro 3 años con alejandro catalan y canto en el conservatorio, hablo ingles, hice la obra los invertidos en 2022");
    await p.getByRole("button", { name: /Mejorar redacción/ }).click();
    await expect(p.getByText("Propuesta", { exact: true })).toBeVisible({ timeout: 60_000 });
    await p.getByRole("button", { name: "Usar este texto" }).click();
    await expect(experiencia).toHaveValue(/Catalán|Catalan/);
    await p.getByRole("button", { name: /Sugerir desde mi experiencia/ }).click();
    await expect(p.getByText(/Marcamos: .*Canto/)).toBeVisible({ timeout: 60_000 });

    // 2. Buscar escribiendo.
    await p.goto(`/talentos?obra=${obra!.id}`);
    await p.getByLabel(/Describí a quién buscás/).fill("actriz de 30 a 40 que cante");
    await p.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(p.getByText(/Aplicamos los filtros/)).toBeVisible({ timeout: 60_000 });
    await expect(p.getByLabel("Edad mínima")).toHaveValue("30");
    await expect(p.getByLabel("Edad máxima")).toHaveValue("40");

    // 3. Saludo al grupo.
    await p.goto(`/salas/${sala!.id}`);
    await p.getByRole("button", { name: /Escribir un saludo al grupo/ }).click();
    await expect(p.getByPlaceholder("Escribí un mensaje…")).toHaveValue(/Lucía/, { timeout: 60_000 });

    // 4. Revisión en Admin.
    const pa = await entrar(browser, adm.email);
    await pa.goto("/admin");
    await pa.getByRole("button", { name: "revisión" }).click();
    await pa.getByRole("button", { name: /Revisar lo reciente con IA/ }).click();
    await expect(pa.getByText(/Revisamos \d+ publicaciones/)).toBeVisible({ timeout: 90_000 });
  });
});
