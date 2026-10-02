import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Indicador de mensajes nuevos en Salas (#216, migración 0082): llega un mensaje → la sala
 * se resalta en `/salas` y "Chats" muestra el badge en la navegación; al entrar a la sala,
 * los dos se apagan y siguen apagados al volver. Mismas condiciones que el resto de
 * `flujos/`: se saltea sin staging. Ver `e2e/README.md`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("mensajes sin leer en Salas (UI)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function nuevoUsuario(nombre: string) {
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

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  // `salas` no cuelga de ningún usuario (la 1:1 no tiene obra ni equipo): borrar a los
  // integrantes no la borra, así que se limpia aparte.
  const salasCreadas: string[] = [];

  test.afterEach(async () => {
    if (salasCreadas.length > 0) {
      const { error } = await admin!.from("salas").delete().in("id", salasCreadas.splice(0));
      if (error) throw error;
    }
    await borrarUsuarios(admin!, usuariosCreados);
  });

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 15_000 });
  }

  test("un mensaje nuevo enciende la sala y el badge; leerla los apaga", async ({ page }) => {
    const sufijo = Date.now();
    const lectora = await nuevoUsuario("Lectora E2E");
    const autor = await nuevoUsuario(`Autor E2E ${sufijo}`);
    const titulo = `Sala E2E ${sufijo}`;

    // Sala 1:1 (sin obra ni equipo): se ve en los dos modos, así no depende de la
    // separación por modo de #144. Se siembra: armarla por UI no es lo que se prueba acá.
    const { data: sala, error: eSala } = await admin!
      .from("salas")
      .insert({ titulo })
      .select("id")
      .single();
    if (eSala) throw eSala;
    salasCreadas.push(sala.id);
    const { error: eInt } = await admin!.from("sala_integrantes").insert([
      { sala_id: sala.id, perfil_id: lectora.id },
      { sala_id: sala.id, perfil_id: autor.id },
    ]);
    if (eInt) throw eInt;

    await login(page, lectora.email);
    await page.goto("/salas");
    // Un chat directo se titula con el nombre de la otra persona, no con el título guardado.
    const tarjeta = page.locator("li", { hasText: `Autor E2E ${sufijo}` });
    await expect(tarjeta).toBeVisible({ timeout: 10_000 });
    await expect(tarjeta).not.toHaveAttribute("data-sin-leer", /.*/);
    await expect(page.getByRole("link", { name: /Chats, \d+ sin leer/ })).toHaveCount(0);

    // 1. Llega un mensaje con la lista abierta: se enciende en vivo, sin recargar.
    const { error: eMsg } = await admin!
      .from("mensajes")
      .insert({ sala_id: sala.id, autor_id: autor.id, contenido: "¿Ensayamos el sábado?" });
    if (eMsg) throw eMsg;
    await expect(tarjeta).toHaveAttribute("data-sin-leer", "true", { timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Chats, 1 sin leer" })).toBeVisible();

    // 2. Entrar a la sala la marca leída.
    await tarjeta.getByRole("link").first().click();
    await expect(page.getByText("¿Ensayamos el sábado?")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Chats, \d+ sin leer/ })).toHaveCount(0);

    // 3. Y queda leída al volver (persiste en la base, no es solo estado del cliente).
    await page.goto("/salas");
    await expect(page.locator("li", { hasText: `Autor E2E ${sufijo}` })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("li", { hasText: `Autor E2E ${sufijo}` })).not.toHaveAttribute("data-sin-leer", /.*/);
    await expect(page.getByRole("link", { name: /Chats, \d+ sin leer/ })).toHaveCount(0);

    // 4. Con el canal ya escuchando, otro mensaje llega por Realtime (el paso 1 lo puede
    // haber levantado la recarga que se hace al suscribirse). La espera es para que la
    // suscripción de esta nueva carga de `/salas` esté arriba antes del INSERT.
    await page.waitForTimeout(3_000);
    const { error: eMsg2 } = await admin!
      .from("mensajes")
      .insert({ sala_id: sala.id, autor_id: autor.id, contenido: "Traigan el guion" });
    if (eMsg2) throw eMsg2;
    await expect(page.locator("li", { hasText: `Autor E2E ${sufijo}` })).toHaveAttribute("data-sin-leer", "true", {
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Chats, 1 sin leer" })).toBeVisible();
    // Y la vista previa se actualiza con el último mensaje (router.refresh de la lista).
    await expect(page.locator("li", { hasText: `Autor E2E ${sufijo}` })).toContainText("Traigan el guion", {
      timeout: 10_000,
    });

    // 5. #222: abierta con carga completa (link directo / recarga), la sala recibe en vivo
    // los mensajes de los demás. Antes el canal se unía sin sesión y no llegaba nada.
    await page.goto(`/salas/${sala.id}`);
    await expect(page.getByText("Traigan el guion")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3_000);
    const { error: eMsg3 } = await admin!
      .from("mensajes")
      .insert({ sala_id: sala.id, autor_id: autor.id, contenido: "Llego tarde" });
    if (eMsg3) throw eMsg3;
    await expect(page.getByText("Llego tarde")).toBeVisible({ timeout: 15_000 });
  });
});
