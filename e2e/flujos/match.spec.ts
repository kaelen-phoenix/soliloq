import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Flujo de match end to end en la UI. NECESITA un proyecto Supabase de **staging** (nunca
 * prod) apuntado por env: `E2E_SUPABASE_URL`, `E2E_SERVICE_KEY`, y `E2E_BASE_URL` con la
 * app corriendo contra esa base. Si falta algo, se saltea. Ver `e2e/README.md`.
 *
 * El circuito ya está cubierto a nivel SQL en `supabase/tests/match_convocatoria.sql`;
 * esto valida la capa de UI (swipe, placa, aviso de match, `/matches`, `/convocatoria`,
 * `/salas`).
 *
 * La aprobación manual (#182), las Normas de la Comunidad (#180) y el onboarding con
 * ubicación por autocomplete de Google no se navegan por UI: se siembran directo con el
 * cliente admin (`service_role`, bypassea RLS), igual que ya hacía el helper de usuarios.
 * Lo que el test SÍ recorre por UI es exactamente el circuito de match que le da nombre.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
// Buenos Aires — mismas coordenadas para Talento y Creador: el buscador de la app no filtra
// por radio salvo que se elija una ubicación explícita, así que esto solo importa para el
// feed del Talento (`feed_para_talento`, que sí respeta `radio_busqueda_metros`).
const LAT = -34.6037;
const LNG = -58.3816;
// PNG 1×1 real — subir un `storage_path` que no existe hace que el optimizador de
// imágenes de Next.js reintente el fetch upstream (400) en cada render que muestra el
// avatar, y eso alcanzó a colgar al server de staging (un solo proceso `next start`)
// durante el circuito completo. Con un archivo real, `getPublicUrl` resuelve a algo servible.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("circuito de match (UI)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];
  // Borrar el usuario no borra los objetos que subió a Storage (no hay cascade ahí) — sin
  // esto, cada corrida deja fotos huérfanas acumulándose en el bucket de staging.
  const fotosSubidas: string[] = [];

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
    fotosSubidas.push(path);
    const { error: eFila } = await admin!
      .from("fotos_talento")
      .insert({ talento_id: id, storage_path: path, orden: 0 });
    if (eFila) throw eFila;
  }

  /** Salta aprobación (#182), Normas (#180) y el onboarding de `/completar-perfil` (ubicación
   *  por Google Places, no automatizable sin mockear la API). */
  async function sembrarTalento(id: string, nombre: string) {
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: new Date().toISOString(),
        normas_aceptadas_en: new Date().toISOString(),
        modo_activo: "talento",
        onboarding_completo: true,
      })
      .eq("id", id);
    if (e1) throw e1;

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
      // Sin esto la pila muestra primero las tarjetas de ejemplo del onboarding.
      onboarding_visto_en: new Date().toISOString(),
    });
    if (e2) throw e2;

    // `buscar_talento` exige al menos una foto.
    await subirFotoTalento(id);
  }

  /** Deja una cuenta en modo Creador con una Obra publicada y un único Rol. `perfiles_creador`
   *  se crea solo (trigger de 0075) al insertar la Obra — no hace falta tocarlo. El Perfil de
   *  Talento es igual obligatorio (#175, es el único perfil "personal"): sin él,
   *  `destinoSegunEstado` manda a `/completar-perfil` sin importar `modo_activo`. */
  async function sembrarCreadorConObra(id: string, nombre: string, tituloObra: string) {
    const { error: e1 } = await admin!
      .from("perfiles")
      .update({
        aprobado_en: new Date().toISOString(),
        normas_aceptadas_en: new Date().toISOString(),
        modo_activo: "creador",
      })
      .eq("id", id);
    if (e1) throw e1;

    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id,
      nombre,
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

    const { data: obra, error: e3 } = await admin!
      .from("obras")
      .insert({
        creador_id: id,
        titulo: tituloObra,
        estado: "publicada",
        ubicacion_texto: "Buenos Aires, Argentina",
        ubicacion_lat: LAT,
        ubicacion_lng: LNG,
        ubicacion_pais: "AR",
      })
      .select("id")
      .single();
    if (e3) throw e3;

    // Un solo rol: con más de uno, "Convocar" abre antes un selector de a cuál asociar
    // (#152) — fuera del alcance de este circuito.
    const { error: e4 } = await admin!
      .from("roles")
      .insert({ obra_id: obra!.id, nombre: "Protagonista", tipo: "actuacion", vacantes: 1 });
    if (e4) throw e4;
  }

  test.afterAll(async () => {
    for (const id of usuariosCreados) await admin?.auth.admin.deleteUser(id).catch(() => {});
    if (fotosSubidas.length > 0) await admin?.storage.from("fotos-perfil").remove(fotosSubidas);
  });

  async function login(page: Page, email: string) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    // El toggle "Ingresar / Crear cuenta" de arriba también se llama "Ingresar": acotar al
    // `<form>` evita el choque con el botón de submit.
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 15_000 });
  }

  test("creador y talento hacen match, convocatoria y llegan a la sala", async ({ page, browser }) => {
    // El circuito completo son dos sesiones reales y muchas idas y vueltas contra Supabase
    // (nada mockeado): el timeout por default de Playwright (30s) se queda corto.
    test.setTimeout(90_000);

    const tituloObra = `Obra E2E ${Date.now()}`;
    const talento = await nuevoUsuario();
    const creador = await nuevoUsuario();
    await sembrarTalento(talento.id, "Talento E2E");
    await sembrarCreadorConObra(creador.id, "Creador E2E", tituloObra);

    // 1. El Talento entra, ve la Obra en su feed y se postula (swipe derecha ≡ "Postularme").
    await login(page, talento.email);
    await page.goto("/");
    await expect(page.getByText(tituloObra)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Postularme" }).click();

    // 2. El Creador entra en su propia sesión (otro contexto de navegador), ve al Talento en
    // `/talentos` y marca "Me interesa". Como el interés ya era mutuo, el match se genera en
    // el momento y `pila-talentos.tsx` abre la placa "Hay interés" ahí mismo.
    const creadorCtx = await browser.newContext();
    const creadorPage = await creadorCtx.newPage();
    await login(creadorPage, creador.email);
    await creadorPage.goto("/talentos");
    await expect(creadorPage.getByText("Talento E2E")).toBeVisible({ timeout: 15_000 });
    // `exact` porque si no, "Me interesa" matchea por substring dentro de "No me interesa".
    await creadorPage.getByRole("button", { name: "Me interesa", exact: true }).click();

    // La cerramos con "Ahora no" a propósito: el circuito completo se sigue desde Call Back
    // (si tocara "Enviar a Convocados" acá, el match saltearía el aviso "¡Tenés un Match!").
    const placaInteres = creadorPage.getByRole("dialog", { name: "Hay interés" });
    await expect(placaInteres).toBeVisible({ timeout: 10_000 });
    await placaInteres.getByRole("button", { name: "Ahora no" }).click();
    await expect(placaInteres).toBeHidden();

    // 3. El aviso "¡Tenés un Match!" (#194) aparece solo, la primera vez que entra a Call Back.
    await creadorPage.goto("/matches");
    const avisoMatch = creadorPage.getByRole("dialog", { name: "Nuevo match" });
    await expect(avisoMatch).toBeVisible({ timeout: 10_000 });
    await avisoMatch.getByRole("button", { name: "Aceptar" }).click();
    await expect(avisoMatch).toBeHidden();

    // 4. Cerrar el aviso no movió nada: el match sigue en Call Back. Aceptarlo ahí sí lo pasa
    // a Convocados (RPC `aceptar_match`, distinto del "Aceptar" del aviso).
    await creadorPage.getByRole("button", { name: "Aceptar" }).click();
    const confirmarMatch = creadorPage.getByRole("dialog", { name: "Confirmar match" });
    await expect(confirmarMatch).toBeVisible({ timeout: 5_000 });
    await confirmarMatch.getByRole("button", { name: "Aceptar" }).click();
    await expect(confirmarMatch).toBeHidden();

    // 5. Convoca en firme. Con un solo Rol no hay selector de por medio (#152).
    await creadorPage.getByRole("button", { name: "Convocar" }).click();
    await expect(creadorPage.getByText("Esperando confirmación")).toBeVisible({ timeout: 10_000 });

    // 6. El aviso de convocatoria (#203) aparece SOLO, en cualquier pantalla — no hace
    // falta navegar a `/convocatoria`. Lo probamos justo en otra pantalla para eso.
    await page.goto("/perfil");
    const avisoConvocatoria = page.getByRole("dialog", { name: "Hay proyecto" });
    await expect(avisoConvocatoria).toBeVisible({ timeout: 15_000 });
    await avisoConvocatoria.getByRole("button", { name: "Aceptar" }).click();
    await page.waitForURL(/\/salas/, { timeout: 10_000 });
    await expect(page.getByText(tituloObra)).toBeVisible();

    // 7. Entra a la sala en sí — valida de paso el gate de modo de #206 (esta sala no es
    // suya como Creador, así que en modo Talento tiene que entrar derecho, sin el aviso
    // "Esta sala es de tu otro modo").
    await page.getByText(tituloObra).click();
    await page.waitForURL(/\/salas\/[^/]+$/, { timeout: 10_000 });
    await expect(page.getByPlaceholder("Escribí un mensaje…")).toBeVisible({ timeout: 10_000 });
    const urlSala = page.url();

    // 8. El gate de #206 en sí: el Creador (que también tiene perfil de Talento — toda
    // cuenta lo tiene, #175) cambia a modo Talento y entra a la MISMA sala por URL directa.
    // Como ahí no es ni dueño ni integrante-como-talento, tiene que ver el aviso "es de tu
    // otro modo" en vez del chat.
    await creadorPage.getByRole("button", { name: "Cambiar a Talento" }).click();
    await creadorPage.waitForURL("/", { timeout: 10_000 });
    await creadorPage.goto(urlSala);
    await expect(creadorPage.getByText("Esta sala es de tu otro modo")).toBeVisible({
      timeout: 10_000,
    });
    await expect(creadorPage.getByPlaceholder("Escribí un mensaje…")).toBeHidden();

    await creadorCtx.close();
  });
});
