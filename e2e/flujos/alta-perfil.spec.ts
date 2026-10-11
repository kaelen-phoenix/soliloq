import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Alta del perfil como asistente por pasos (#383): no avanza sin lo obligatorio, lo opcional
 * no frena, se puede volver atrás, lo cargado se guarda en la base y se retoma desde otro
 * dispositivo, y al confirmar queda el perfil (y no vuelve a aparecer el asistente).
 * Google Places se reemplaza por un script falso, como en `local/todos-los-formularios`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
// PNG 1×1.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const MAPS_FALSO = `
(function () {
  var params = new URL(document.currentScript.src).searchParams;
  var lugar = {
    formattedAddress: "Palermo, CABA, Argentina",
    location: { lat: function () { return -34.588; }, lng: function () { return -58.43; } },
    addressComponents: [
      { types: ["sublocality_level_1"], longText: "Palermo", shortText: "Palermo" },
      { types: ["locality"], longText: "Buenos Aires", shortText: "CABA" },
      { types: ["country"], longText: "Argentina", shortText: "AR" }
    ]
  };
  function Token() {}
  window.google = window.google || {};
  window.google.maps = window.google.maps || {};
  window.google.maps.places = {
    AutocompleteSessionToken: Token,
    AutocompleteSuggestion: {
      fetchAutocompleteSuggestions: function () {
        return Promise.resolve({ suggestions: [{ placePrediction: {
          placeId: "e2e-palermo",
          text: { toString: function () { return "Palermo, Buenos Aires, Argentina"; } },
          toPlace: function () { return { fetchFields: function () { return Promise.resolve({ place: lugar }); } }; }
        } }] });
      }
    }
  };
  var cb = params.get("callback");
  if (cb && window[cb]) window[cb]();
})();`;

test.describe("alta del perfil (UI)", () => {
  test.skip(!URL || !KEY, "requiere E2E_SUPABASE_URL y E2E_SERVICE_KEY (staging)");
  test.setTimeout(180_000);
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

  /** Un navegador «nuevo» (otro dispositivo: sin el borrador del teléfono), ya con sesión. */
  async function entrar(browser: Browser, email: string): Promise<Page> {
    const ctx = await browser.newContext();
    await ctx.route("https://maps.googleapis.com/maps/api/js**", (r) =>
      r.fulfill({ contentType: "application/javascript", body: MAPS_FALSO }),
    );
    const page = await ctx.newPage();
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/completar-perfil/, { timeout: 30_000 });
    return page;
  }

  const paso = (page: Page, n: number) => expect(page.getByText(`Paso ${n} de 6`, { exact: true })).toBeVisible({ timeout: 15_000 });
  const siguiente = (page: Page) => page.getByRole("button", { name: "Siguiente" }).click();

  test("asistente por pasos: obligatorio, opcional, volver, retomar en otro dispositivo y confirmar", async ({
    browser,
  }) => {
    const email = `e2e-${Date.now()}-alta@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error) throw error;
    const id = data.user.id;
    usuariosCreados.push(id);
    // Aprobada y con Normas aceptadas, sin Perfil de Talento: cae en /completar-perfil.
    const ahora = new Date().toISOString();
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({ aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora })
      .eq("id", id);
    if (e1) throw e1;

    // ── Paso 1: sin lo obligatorio no avanza ────────────────────────────────
    let page = await entrar(browser, email);
    await paso(page, 1);
    await siguiente(page);
    await expect(page.locator("[data-formulario-talento] .text-error-600").first()).toBeVisible();
    await paso(page, 1);

    await page.getByLabel("Nombre completo").fill("Alta Wizard E2E");
    await page.getByLabel("Fecha de nacimiento").fill("05051995");
    await page.getByLabel("Ubicación").fill("Palermo");
    await page.getByRole("button", { name: /Palermo, Buenos Aires/ }).click();
    await page.getByLabel("Género").selectOption({ index: 1 });
    await siguiente(page);

    // ── Paso 2: fotos (obligatorio) ─────────────────────────────────────────
    await paso(page, 2);
    await siguiente(page);
    await expect(page.locator("[data-formulario-talento] .text-error-600").first()).toBeVisible();
    await paso(page, 2);
    await page.locator('input[type="file"]').setInputFiles(
      [1, 2, 3].map((n) => ({ name: `foto${n}.png`, mimeType: "image/png", buffer: PNG })),
    );
    await expect(page.getByText("3/5 fotos")).toBeVisible({ timeout: 30_000 });
    await siguiente(page);
    await paso(page, 3);

    // El borrador quedó en la base, en el paso 3.
    await expect
      .poll(async () => (await admin!.from("borradores_perfil").select("paso").eq("perfil_id", id).maybeSingle()).data?.paso, {
        timeout: 15_000,
      })
      .toBe(3);

    // ── Otro dispositivo: retoma donde quedó ────────────────────────────────
    await page.context().close();
    page = await entrar(browser, email);
    await paso(page, 3);
    await expect(page.getByText("Recuperamos lo que habías cargado")).toBeVisible();
    // Volver atrás conserva lo cargado.
    await page.getByRole("button", { name: "Atrás" }).click();
    await paso(page, 2);
    await expect(page.getByText("3/5 fotos")).toBeVisible();
    await page.getByRole("button", { name: "Atrás" }).click();
    await paso(page, 1);
    await expect(page.getByLabel("Nombre completo")).toHaveValue("Alta Wizard E2E");
    await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("05/05/1995");
    await siguiente(page);
    await paso(page, 2);
    await siguiente(page);

    // ── Pasos opcionales: se completan o no, sin frenar ─────────────────────
    await paso(page, 3);
    await page.getByLabel("Formación artística").fill("Escuela de teatro del barrio (2014-2017).");
    await siguiente(page);
    await paso(page, 4);
    await siguiente(page);
    await paso(page, 5);
    await siguiente(page);

    // ── Paso 6: revisar y confirmar ─────────────────────────────────────────
    await paso(page, 6);
    await expect(page.getByText("Alta Wizard E2E")).toBeVisible();
    await expect(page.getByText("Escuela de teatro del barrio (2014-2017).")).toBeVisible();
    await page.getByRole("button", { name: "Completar perfil" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/completar-perfil"), { timeout: 30_000 });

    const { data: talento } = await admin!
      .from("perfiles_talento")
      .select("nombre, fecha_nacimiento, formacion, ubicacion_publica")
      .eq("id", id)
      .single();
    expect(talento).toMatchObject({
      nombre: "Alta Wizard E2E",
      fecha_nacimiento: "1995-05-05",
      formacion: "Escuela de teatro del barrio (2014-2017).",
    });
    expect(talento?.ubicacion_publica).toContain("Palermo");
    const { count: fotos } = await admin!.from("fotos_talento").select("id", { count: "exact", head: true }).eq("talento_id", id);
    expect(fotos).toBe(3);
    // El borrador ya no hace falta, y el asistente no vuelve a aparecer.
    const { data: borrador } = await admin!.from("borradores_perfil").select("perfil_id").eq("perfil_id", id).maybeSingle();
    expect(borrador).toBeNull();
    await page.goto("/completar-perfil");
    await expect(page).not.toHaveURL(/\/completar-perfil/);
  });
});
