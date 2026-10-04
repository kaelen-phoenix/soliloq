import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Tres superficies que `match.spec.ts` no toca, escritas durante una exploración de punta a
 * punta pedida por reportes de usuarios de "cosas que dejaron de funcionar" (issue #215):
 * armar un Equipo desde cero por UI (a diferencia del match, que siembra la Obra directo),
 * el panel de admin, y notificaciones/campanita. Mismas condiciones que `match.spec.ts`: se
 * saltea sin `E2E_SUPABASE_URL`/`E2E_SERVICE_KEY`/`E2E_BASE_URL` (staging). Ver `e2e/README.md`.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
const LAT = -34.6037;
const LNG = -58.3816;
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("equipo, admin y notificaciones (UI)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  async function nuevoUsuario() {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error) throw error;
    usuariosCreados.push(data.user.id);
    return { id: data.user.id, email };
  }

  async function subirFotoTalento(id: string) {
    const path = `e2e/${id}.png`;
    const { error: eSubida } = await admin!.storage
      .from("fotos-perfil")
      .upload(path, PNG_1X1, { contentType: "image/png", upsert: true });
    if (eSubida) throw eSubida;
    const { error: eFila } = await admin!
      .from("fotos_talento")
      .insert({ talento_id: id, storage_path: path, orden: 0 });
    if (eFila) throw eFila;
  }

  /** Perfil de Talento mínimo (el único "personal", #175) — sin él `destinoSegunEstado`
   *  manda a `/completar-perfil` sin importar `modo_activo` ni `es_admin`. */
  async function sembrarBase(
    id: string,
    nombre: string,
    opciones: { modoActivo: "talento" | "creador"; esAdmin?: boolean },
  ) {
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: new Date().toISOString(),
        normas_aceptadas_en: new Date().toISOString(),
        // El tour guiado (#231) taparía la pantalla: los tests que no lo prueban lo dan por visto.
        tour_talento_visto_en: new Date().toISOString(),
        tour_creador_visto_en: new Date().toISOString(),
        modo_activo: opciones.modoActivo,
        es_admin: opciones.esAdmin ?? false,
      })
      .eq("id", id);
    if (e1) throw e1;

    // Aprobarla le deja el aviso `acceso_habilitado` (0092, #247): es ruido de la siembra, y
    // contaría en la campanita de los tests que miran «N sin leer». Se da por leído.
    const { error: eAviso } = await admin!
      .from("notificaciones")
      .update({ leida_en: new Date().toISOString() })
      .eq("destinatario_id", id)
      .eq("tipo", "acceso_habilitado");
    if (eAviso) throw eAviso;

    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id,
      nombre,
      fecha_nacimiento: "1995-01-01",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_publica: "Buenos Aires",
      ubicacion_lat: LAT,
      ubicacion_lng: LNG,
      ubicacion_pais: "AR",
      genero: "sin_especificar",
      onboarding_visto_en: new Date().toISOString(),
    });
    if (e2) throw e2;
    await subirFotoTalento(id);
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

  test("Creador arma un equipo por UI y un Talento lo ve en su feed", async ({
    page,
  }) => {
    const tituloEquipo = `Equipo E2E ${Date.now()}`;
    const creador = await nuevoUsuario();
    const talento = await nuevoUsuario();
    await sembrarBase(creador.id, "Creador Equipo E2E", { modoActivo: "creador" });
    await sembrarBase(talento.id, "Talento Equipo E2E", { modoActivo: "talento" });

    // 1. El Creador arma el equipo desde Mis proyectos (`/proyectos`), sin pasar por la siembra directa
    // que usa `match.spec.ts` para la Obra — acá interesa probar el formulario en sí.
    await login(page, creador.email);
    await page.goto("/proyectos");
    // #341: «Crear proyecto» → «¿Qué querés armar?» → «Armar equipo».
    await page.getByRole("button", { name: "Crear proyecto" }).click();
    await page.getByRole("button", { name: /Armar equipo/ }).click();
    await page.getByLabel("Título — por qué querés armar el equipo").fill(tituloEquipo);
    await page.getByRole("button", { name: "Armar equipo", exact: true }).click();
    // Recién armado, va a su pantalla.
    await page.waitForURL(/\/equipos\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByText(tituloEquipo)).toBeVisible({ timeout: 10_000 });

    // 2. Para salir en el feed del Talento (`/`, `feed_equipos_para_talento`) el equipo
    // necesita 3 fotos; subirlas por UI no es lo que se prueba acá, se siembran.
    const { data: equipo, error: eEquipo } = await admin!
      .from("equipos")
      .select("id")
      .eq("creador_id", creador.id)
      .single();
    if (eEquipo) throw eEquipo;
    for (const orden of [0, 1, 2]) {
      const path = `e2e/${creador.id}-equipo-${orden}.png`;
      const { error: eSubida } = await admin!.storage
        .from("fotos-perfil")
        .upload(path, PNG_1X1, { contentType: "image/png", upsert: true });
      if (eSubida) throw eSubida;
      const { error: eFoto } = await admin!
        .from("fotos_equipo")
        .insert({ equipo_id: equipo.id, storage_path: path, orden });
      if (eFoto) throw eFoto;
    }

    // 3. Un Talento lo ve en su feed de Convocatorias.
    await page.context().clearCookies();
    await login(page, talento.email);
    await page.goto("/");
    await expect(page.getByText(tituloEquipo)).toBeVisible({ timeout: 15_000 });
  });

  test("Panel de admin carga métricas y usuarios sin error", async ({ page }) => {
    const cuenta = await nuevoUsuario();
    await sembrarBase(cuenta.id, "Admin E2E", { modoActivo: "talento", esAdmin: true });

    await login(page, cuenta.email);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible({
      timeout: 10_000,
    });
    // Una de las tarjetas de `Resumen` (admin_metricas) — si la RPC fallara, no se vería
    // el heading "Usuarios" ni ningún número, y el bloque quedaría vacío.
    await expect(page.getByText("Usuarios", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "usuarios" }).click();
    // La propia cuenta admin tiene que aparecer en `admin_usuarios` (sin filtro, primera página).
    await expect(page.getByText("Admin E2E")).toBeVisible({ timeout: 10_000 });
  });

  test("Notificación de interés recibido aparece en /notificaciones y en la campanita", async ({
    page,
  }) => {
    const destinatario = await nuevoUsuario();
    const origen = await nuevoUsuario();
    await sembrarBase(destinatario.id, "Destinatario E2E", { modoActivo: "talento" });
    await sembrarBase(origen.id, "Origen E2E", { modoActivo: "talento" });

    const { error } = await admin!.from("notificaciones").insert({
      destinatario_id: destinatario.id,
      tipo: "interes_recibido",
      de_perfil: origen.id,
    });
    if (error) throw error;

    await login(page, destinatario.email);
    await page.goto("/");
    // La campanita (`CampanitaNotificaciones`) trae el conteo de no leídas por polling propio
    // al montar — un `aria-label` con "1 sin leer" confirma que llegó sin tener que abrir
    // la lista primero.
    await expect(page.getByRole("link", { name: /Notificaciones, 1 sin leer/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/notificaciones");
    await expect(page.getByText("Alguien quiso contactarte desde tu perfil")).toBeVisible({
      timeout: 10_000,
    });

    // #347: leerla baja la campanita en el momento, sin recargar (antes quedaba «1 sin leer»).
    await page.getByText("Alguien quiso contactarte desde tu perfil").click();
    await expect(page.getByRole("link", { name: "Notificaciones", exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect.poll(async () => {
      const { data } = await admin!.from("notificaciones").select("leida_en").eq("destinatario_id", destinatario.id);
      return data?.every((n) => n.leida_en !== null);
    }, { timeout: 10_000 }).toBe(true);

    // Y una nueva aparece en vivo, sin recargar (Realtime, 0106).
    const { error: e2 } = await admin!.from("notificaciones").insert({
      destinatario_id: destinatario.id,
      tipo: "interes_recibido",
      de_perfil: origen.id,
    });
    if (e2) throw e2;
    await expect(page.getByRole("link", { name: /Notificaciones, 1 sin leer/ }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
