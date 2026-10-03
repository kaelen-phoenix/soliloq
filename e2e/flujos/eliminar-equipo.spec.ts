import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Eliminar un Equipo (#215, migración 0083): el Creador lo borra desde el tablero y el
 * Talento que había convocado vuelve a aparecer en Buscar Talentos; la sala del equipo se
 * va con él. Se saltea sin staging, igual que el resto de `flujos/` (ver `e2e/README.md`).
 *
 * El recorrido hasta la sala (swipe → match → convocar) ya lo cubre `match.spec.ts`: acá se
 * siembra directo con el cliente admin, y lo que se navega es el borrado y la búsqueda.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("eliminar equipo (UI)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function nuevoUsuario(nombre: string, modo: "talento" | "creador") {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error) throw error;
    usuariosCreados.push(data.user.id);
    const id = data.user.id;

    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: new Date().toISOString(),
        normas_aceptadas_en: new Date().toISOString(),
        // El tour guiado (#231) taparía la pantalla: los tests que no lo prueban lo dan por visto.
        tour_talento_visto_en: new Date().toISOString(),
        tour_creador_visto_en: new Date().toISOString(),
        modo_activo: modo,
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
    // `buscar_talento` solo muestra a quien tiene al menos una foto.
    const path = `e2e/${id}.png`;
    const { error: e3 } = await admin!.storage
      .from("fotos-perfil")
      .upload(path, PNG_1X1, { contentType: "image/png", upsert: true });
    if (e3) throw e3;
    const { error: e4 } = await admin!
      .from("fotos_talento")
      .insert({ talento_id: id, storage_path: path, orden: 0 });
    if (e4) throw e4;
    return { id, email };
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 15_000 });
  }

  test("el Creador elimina su Equipo y el Talento convocado vuelve a Buscar Talentos", async ({
    page,
  }) => {
    const sufijo = Math.random().toString(36).slice(2, 8);
    const nombreTalento = `Talento Liberado ${sufijo}`;
    const tituloEquipo = `Equipo a eliminar ${sufijo}`;
    const creador = await nuevoUsuario(`Creador Equipo ${sufijo}`, "creador");
    const talento = await nuevoUsuario(nombreTalento, "talento");

    const { data: equipo, error: eEquipo } = await admin!
      .from("equipos")
      .insert({ creador_id: creador.id, titulo: tituloEquipo, cupo: 3 })
      .select("id")
      .single();
    if (eEquipo) throw eEquipo;
    // Interés mutuo (el trigger de 0054 arma el match) y la sala con los dos adentro.
    const { error: eInt } = await admin!.from("intereses_match").insert([
      { de_perfil: creador.id, a_perfil: talento.id, equipo_id: equipo.id, interesa: true },
      { de_perfil: talento.id, a_perfil: creador.id, equipo_id: equipo.id, interesa: true },
    ]);
    if (eInt) throw eInt;
    const { data: sala, error: eSala } = await admin!
      .from("salas")
      .insert({ equipo_id: equipo.id })
      .select("id")
      .single();
    if (eSala) throw eSala;
    const { error: eSi } = await admin!.from("sala_integrantes").insert([
      { sala_id: sala.id, perfil_id: creador.id },
      { sala_id: sala.id, perfil_id: talento.id },
    ]);
    if (eSi) throw eSi;

    await login(page, creador.email);

    // 1. Con el equipo vivo, el Talento ya decidido no aparece en la búsqueda (0058).
    await page.goto("/talentos");
    await page.getByRole("textbox", { name: "Buscar" }).fill(sufijo);
    await expect(page.getByText(nombreTalento)).toHaveCount(0, { timeout: 10_000 });

    // 2. Eliminar el equipo desde Mis proyectos (con equipo activo abre en "Armar equipo").
    await page.goto("/proyectos");
    await expect(page.getByText(tituloEquipo)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Eliminar equipo" }).click();
    await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
    await page.getByRole("button", { name: "Eliminar definitivamente" }).click();
    await expect(page.getByText(tituloEquipo)).toHaveCount(0, { timeout: 10_000 });

    // 3. El Talento vuelve a Buscar Talentos. Buscar pide una iniciativa activa ("Creá un
    // proyecto o equipo para empezar a buscar talento"), y el Creador acaba de borrar la
    // única que tenía: arma otra —el caso real de #215, "considerados para nuevas
    // convocatorias"— y ahí lo encuentra. Crearla por UI ya lo cubre otro spec.
    const { error: eNuevo } = await admin!
      .from("equipos")
      .insert({ creador_id: creador.id, titulo: `Equipo nuevo ${sufijo}`, cupo: 3 });
    if (eNuevo) throw eNuevo;
    await page.goto("/talentos");
    await page.getByRole("textbox", { name: "Buscar" }).fill(sufijo);
    await expect(page.getByText(nombreTalento)).toBeVisible({ timeout: 15_000 });

    // 4. La sala se fue con el equipo (antes quedaba huérfana, con integrantes y todo).
    const { count } = await admin!
      .from("salas")
      .select("id", { count: "exact", head: true })
      .eq("id", sala.id);
    expect(count).toBe(0);
  });
});
