import { test, type Page, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Recorrido de UX (#285): pasa por todas las pantallas en tamaño celular, como cada tipo de
 * usuario, y guarda una captura de cada una en `E2E_RECORRIDO_DIR`. No afirma nada: es para
 * mirar la app entera de una vez y encontrar lo que confunde o está roto.
 *
 *   E2E_RECORRIDO=1 E2E_RECORRIDO_DIR=/tmp/recorrido npx playwright test e2e/local/recorrido-ux.spec.ts
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const DIR = process.env.E2E_RECORRIDO_DIR ?? "recorrido-ux";
const PASS = "test-1234-abcd";
// Ancho del teléfono (E2E_ANCHO=320 para los más angostos). Cada captura anota lo que se sale.
const ANCHO = Number(process.env.E2E_ANCHO ?? 390);
const LAT = -34.6037;
const LNG = -58.3816;
// PNG 1×1: alcanza para que las pantallas con fotos tengan algo que mostrar.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("recorrido de UX", () => {
  test.skip(process.env.E2E_RECORRIDO !== "1" || !URL || !KEY, "solo a mano: E2E_RECORRIDO=1 + staging");
  test.setTimeout(600_000);

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];
  let n = 0;

  async function captura(page: Page, nombre: string) {
    fs.mkdirSync(DIR, { recursive: true });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(600);
    n++;
    const fuera = await page.evaluate((w) => {
      const salidos: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(el).position === "fixed") continue;
        if (r.right > w + 1) salidos.push(`${el.tagName.toLowerCase()} → ${Math.round(r.right)} «${(el.textContent ?? "").trim().slice(0, 30)}»`);
      }
      return { scroll: document.documentElement.scrollWidth, salidos: salidos.slice(0, 6) };
    }, ANCHO);
    const linea = fuera.scroll > ANCHO || fuera.salidos.length
      ? `${nombre}: scrollWidth=${fuera.scroll} ${fuera.salidos.join(" | ")}`
      : `${nombre}: OK`;
    fs.appendFileSync(path.join(DIR, "informe.txt"), `${linea}\n`);
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${nombre}.png`), fullPage: true });
  }

  async function crearUsuario(nombre: string, opciones: { completo?: boolean; modo?: "talento" | "creador"; fotos?: number; admin?: boolean; enlace?: boolean } = {}) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("sin usuario");
    const id = data.user.id;
    usuarios.push(id);
    if (opciones.completo !== false) {
      const ahora = new Date().toISOString();
      await admin!.from("perfiles").update({
        aprobado_en: ahora,
        normas_aceptadas_en: ahora,
        modo_activo: opciones.modo ?? "talento",
        es_admin: !!opciones.admin,
        enlace_publico_activo: !!opciones.enlace,
        tour_talento_visto_en: ahora,
        tour_creador_visto_en: ahora,
        bienvenida_enviada_en: ahora,
      }).eq("id", id);
      await admin!.from("notificaciones").update({ leida_en: ahora }).eq("destinatario_id", id);
      await admin!.from("perfiles_talento").insert({
        id,
        nombre,
        fecha_nacimiento: "1994-05-10",
        ubicacion_texto: "Buenos Aires, Argentina",
        ubicacion_publica: "Palermo",
        ubicacion_lat: LAT,
        ubicacion_lng: LNG,
        ubicacion_pais: "AR",
        genero: "sin_especificar",
        experiencia: "Formación en teatro independiente. Obras: «La gaviota», «Bodas de sangre».",
        habilidades: ["Canto", "Improvisación"],
        redes: { instagram: "https://instagram.com/prueba" },
        onboarding_visto_en: ahora,
      });
      for (let orden = 0; orden < (opciones.fotos ?? 3); orden++) {
        const p = `e2e/${id}-${orden}.png`;
        await admin!.storage.from("fotos-perfil").upload(p, PNG, { contentType: "image/png", upsert: true });
        await admin!.from("fotos_talento").insert({ talento_id: id, storage_path: p, orden });
      }
    }
    return { id, email };
  }

  async function entrar(browser: Browser, email: string) {
    const ctx = await browser.newContext({ viewport: { width: ANCHO, height: 844 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
    return page;
  }

  test.afterAll(async () => {
    if (admin) await borrarUsuarios(admin, usuarios);
  });

  test("todas las pantallas", async ({ browser }) => {
    // ── Datos ──
    const talento = await crearUsuario("Lucía Talento", { enlace: true });
    const creador = await crearUsuario("Martín Creador", { modo: "creador" });
    const adm = await crearUsuario("Ana Admin", { admin: true });
    const nuevo = await crearUsuario("", { completo: false });

    const { data: obra } = await admin!.from("obras").insert({
      creador_id: creador.id,
      titulo: "Hamlet en el Galpón",
      sinopsis: "Buscamos elenco para una versión contemporánea de Hamlet.",
      ubicacion_publica: "Palermo",
      estado: "publicada",
      ubicacion_texto: "Buenos Aires, Argentina",
      ubicacion_lat: LAT,
      ubicacion_lng: LNG,
      ubicacion_pais: "AR",
    }).select("id").single();
    await admin!.from("roles").insert([
      { obra_id: obra!.id, nombre: "Ofelia", tipo: "actuacion", vacantes: 1 },
      { obra_id: obra!.id, nombre: "Iluminación", tipo: "tecnica", vacantes: 1 },
    ]);
    // Match: el talento se interesó en el proyecto y el creador en el talento.
    await admin!.from("intereses_match").insert([
      { de_perfil: talento.id, a_perfil: creador.id, obra_id: obra!.id, interesa: true },
      { de_perfil: creador.id, a_perfil: talento.id, obra_id: obra!.id, interesa: true },
    ]);
    const { data: token } = await admin!.from("perfiles").select("enlace_token").eq("id", talento.id).single();

    // ── Sin cuenta ──
    const anon = await (await browser.newContext({ viewport: { width: ANCHO, height: 844 } })).newPage();
    for (const [ruta, nombre] of [
      ["/bienvenida", "anon-landing"],
      ["/ingresar", "anon-ingresar"],
      ["/ingresar?modo=registrarme", "anon-registrarme"],
      [`/p/${token!.enlace_token}`, "anon-perfil-publico"],
      ["/apoyar", "anon-apoyar"],
      ["/normas", "anon-normas"],
      ["/recuperar", "anon-recuperar"],
    ] as const) {
      await anon.goto(ruta);
      await captura(anon, nombre);
    }

    // ── Alta: recién registrada (pendiente) ──
    const pNuevo = await entrar(browser, nuevo.email);
    await captura(pNuevo, "alta-solicitud-pendiente");
    await admin!.from("perfiles").update({ aprobado_en: new Date().toISOString() }).eq("id", nuevo.id);
    await pNuevo.goto("/");
    await captura(pNuevo, "alta-aceptar-normas");
    await admin!.from("perfiles").update({ normas_aceptadas_en: new Date().toISOString() }).eq("id", nuevo.id);
    await pNuevo.goto("/");
    await captura(pNuevo, "alta-completar-perfil");

    // ── Talento ──
    const pT = await entrar(browser, talento.email);
    for (const [ruta, nombre] of [
      ["/", "talento-feed"],
      ["/matches", "talento-matches"],
      ["/convocatoria", "talento-convocatorias"],
      ["/salas", "talento-chats"],
      ["/perfil", "talento-perfil"],
      ["/perfil?editar=1", "talento-perfil-editar"],
      ["/notificaciones", "talento-notificaciones"],
      ["/ajustes", "talento-ajustes"],
    ] as const) {
      await pT.goto(ruta);
      await captura(pT, nombre);
    }

    // ── Creador ──
    const pC = await entrar(browser, creador.email);
    for (const [ruta, nombre] of [
      ["/proyectos", "creador-tablero"],
      ["/matches", "creador-matches"],
      ["/talentos", "creador-buscar"],
      [`/obras/${obra!.id}`, "creador-proyecto"],
      ["/salas", "creador-chats"],
      ["/perfil", "creador-perfil"],
    ] as const) {
      await pC.goto(ruta);
      await captura(pC, nombre);
    }

    // ── Admin ──
    const pA = await entrar(browser, adm.email);
    await pA.goto("/admin");
    await captura(pA, "admin-resumen");
    for (const pestana of ["usuarios", "acceso", "publicaciones", "denuncias"]) {
      await pA.getByRole("button", { name: pestana, exact: true }).click();
      await captura(pA, `admin-${pestana}`);
    }
  });
});
