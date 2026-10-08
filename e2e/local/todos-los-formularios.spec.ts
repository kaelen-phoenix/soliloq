import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { borrarUsuarios } from "../flujos/limpieza";

/**
 * Todos los formularios de la app, enviados de verdad (#349), como lo haría una persona nueva:
 * registrarse, recuperar la clave, contacto de «Apoyar», aceptar las Normas, alta del perfil,
 * editar el perfil, crear un proyecto con roles, agregar un rol, editar el proyecto, subir una
 * foto y publicar, armar y editar un equipo, buscar talento, denunciar un perfil, escribir en
 * un chat, ajustes y cambiar la clave. Cada uno se verifica en la pantalla y en la base.
 *
 * Google Maps se simula (la clave real está restringida al dominio): se intercepta el script y
 * se devuelve un buscador que siempre propone «Palermo». El resto es la app de verdad.
 *
 *   E2E_FORMULARIOS_TODOS=1 npx playwright test e2e/local/todos-los-formularios.spec.ts
 *   (la app tiene que estar compilada con NEXT_PUBLIC_GOOGLE_MAPS_API_KEY definida, con cualquier valor)
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";
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

test.describe("todos los formularios", () => {
  test.skip(process.env.E2E_FORMULARIOS_TODOS !== "1" || !URL || !KEY, "solo a mano: E2E_FORMULARIOS_TODOS=1 + staging");
  test.setTimeout(600_000);
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.afterAll(async () => {
    if (!admin) return;
    for (const id of usuarios) {
      const { data } = await admin.storage.from("fotos-perfil").list(id);
      if (data?.length) await admin.storage.from("fotos-perfil").remove(data.map((a) => `${id}/${a.name}`));
    }
    await borrarUsuarios(admin, usuarios);
  });

  async function elegirUbicacion(page: Page, etiqueta: string) {
    await page.getByLabel(etiqueta).fill("Palermo");
    await page.getByRole("button", { name: /Palermo, Buenos Aires/ }).click();
  }

  async function entrar(page: Page, email: string, clave = PASS) {
    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(email);
    await page.getByLabel("Contraseña").fill(clave);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  test("cada formulario guarda", async ({ browser }) => {
    const s = Date.now();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route("https://maps.googleapis.com/maps/api/js**", (r) =>
      r.fulfill({ contentType: "application/javascript", body: MAPS_FALSO }),
    );
    const page = await ctx.newPage();

    // ── 1. Registrarse ──────────────────────────────────────────────────────
    // (Un alta exitosa por el formulario no se puede probar acá: staging rechaza los dominios de
    // prueba y no manda el correo de confirmación a direcciones de afuera del equipo.)
    // Supabase rechaza los dominios de prueba (`@test.local`): el formulario tiene que mostrar
    // el error en castellano (#349: antes salía el texto de Supabase en inglés). La cuenta para
    // el resto del recorrido se crea por el admin, como si hubiera confirmado el email.
    const emailNuevo = `e2e-${s}-alta@test.local`;
    await page.goto("/ingresar?modo=registrarme");
    await page.getByLabel("Tu email").fill(emailNuevo);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Crear cuenta" }).click();
    // Según el momento, Supabase rechaza el dominio o frena por cantidad de intentos: los dos en castellano.
    await expect(page.getByText(/Ese email no parece válido|Demasiados intentos/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/is invalid/)).toHaveCount(0);
    const creado = await admin!.auth.admin.createUser({ email: emailNuevo, password: PASS, email_confirm: true });
    if (creado.error) throw creado.error;
    const nuevo = creado.data.user!;
    usuarios.push(nuevo.id);
    await admin!.from("perfiles").update({ aprobado_en: new Date().toISOString() }).eq("id", nuevo.id);

    // ── 2. Recuperar la clave ───────────────────────────────────────────────
    await page.context().clearCookies();
    await page.goto("/recuperar");
    await page.getByLabel("Tu email").fill(emailNuevo);
    await page.locator("form").getByRole("button").first().click();
    await expect(page.getByText(/te mandamos|revisá tu (mail|correo|email)|enviamos/i)).toBeVisible({ timeout: 20_000 });

    // ── 3. Contacto de «Apoyar» ─────────────────────────────────────────────
    await page.goto("/apoyar");
    await page.getByLabel("Nombre").fill("Prueba de formularios");
    await page.getByLabel("Email").fill(`e2e-${s}-contacto@test.local`);
    await page.getByLabel("Mensaje").fill("Mensaje de prueba de todos los formularios.");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("¡Gracias! Recibimos tu mensaje")).toBeVisible({ timeout: 15_000 });

    // ── 4. Aceptar las Normas ───────────────────────────────────────────────
    await entrar(page, emailNuevo);
    await expect(page).toHaveURL(/\/aceptar-normas/, { timeout: 20_000 });
    await page.getByLabel("Leí y acepto las Normas de la Comunidad de Yalope.").check();
    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    // El alta se muestra en la ruta a la que vuelve (el middleware decide qué pantalla toca).
    await expect(page.getByRole("heading", { name: "Contanos sobre vos" })).toBeVisible({ timeout: 20_000 });

    // ── 5. Alta del perfil ──────────────────────────────────────────────────
    await page.getByLabel("Nombre completo").fill(`Formularios E2E ${s}`);
    await page.getByLabel("Fecha de nacimiento").fill("05051990");
    await elegirUbicacion(page, "Ubicación");
    await page.getByLabel("Género").selectOption({ index: 1 });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText(/1\/5 fotos/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Completar perfil" }).click();
    await expect(page.getByRole("heading", { name: "Explorar" })).toBeVisible({ timeout: 30_000 });
    const { data: talento } = await admin!.from("perfiles_talento").select("nombre, ubicacion_publica, fecha_nacimiento").eq("id", nuevo.id).single();
    expect(talento?.nombre).toBe(`Formularios E2E ${s}`);
    expect(talento?.fecha_nacimiento).toBe("1990-05-05");
    expect(talento?.ubicacion_publica).toContain("Palermo");

    // ── 6. Editar el perfil ─────────────────────────────────────────────────
    await page.goto("/perfil?editar=1");
    await page.getByLabel("Experiencia").fill("Teatro independiente y comedia musical.");
    await page.getByRole("button", { name: "Canto", exact: true }).click();
    await page.getByLabel("Instagram").fill("@formularios_e2e");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(async () => {
      const { data } = await admin!.from("perfiles_talento").select("experiencia, habilidades, redes").eq("id", nuevo.id).single();
      return [data?.experiencia, (data?.habilidades ?? []).includes("Canto"), JSON.stringify(data?.redes ?? {}).includes("formularios_e2e")];
    }, { timeout: 15_000 }).toEqual(["Teatro independiente y comedia musical.", true, true]);

    // ── 7. Crear un proyecto con roles ──────────────────────────────────────
    await page.goto("/proyectos");
    await page.getByRole("button", { name: "Crear", exact: true }).click();
    await page.getByRole("button", { name: /Un proyecto con roles/ }).click();
    await page.getByLabel("Título del proyecto").fill(`Proyecto formularios ${s}`);
    await elegirUbicacion(page, "Locación de ensayos");
    await page.getByLabel("Rol buscado").fill("Protagonista");
    await page.getByRole("button", { name: "+ Agregar rol" }).click();
    await page.getByRole("button", { name: "Crear proyecto" }).last().click();
    await expect(page).toHaveURL(/\/obras\/[^/?]+$/, { timeout: 30_000 });
    const obraId = page.url().split("/obras/")[1];
    const { data: roles1 } = await admin!.from("roles").select("nombre").eq("obra_id", obraId);
    expect(roles1?.map((r) => r.nombre)).toEqual(["Protagonista"]);

    // ── 8. Agregar un rol desde la pantalla del proyecto ───────────────────
    await page.getByRole("button", { name: /Agregar (un )?rol/ }).first().click();
    await page.getByLabel(/Nombre del rol|Rol/).first().fill("Antagonista");
    await page.getByRole("button", { name: "Guardar rol" }).click();
    await expect(page.getByText("Antagonista")).toBeVisible({ timeout: 15_000 });

    // ── 9. Editar el proyecto ───────────────────────────────────────────────
    await page.goto(`/obras/${obraId}?editar=1`);
    await page.getByLabel(/Título/).first().fill(`Proyecto editado ${s}`);
    await page.getByRole("button", { name: /Guardar/ }).first().click();
    await expect.poll(async () => (await admin!.from("obras").select("titulo").eq("id", obraId).single()).data?.titulo, { timeout: 15_000 }).toBe(`Proyecto editado ${s}`);

    // ── 10. Foto y publicar ─────────────────────────────────────────────────
    await page.goto(`/obras/${obraId}`);
    await page.locator('input[type="file"]').first().setInputFiles({ name: "obra.png", mimeType: "image/png", buffer: PNG });
    // Sin esperar a que termine de subir (#349): «Publicar» queda en espera hasta que la foto está.
    await page.getByRole("button", { name: "Publicar convocatoria" }).click();
    await expect(page.getByRole("button", { name: "Cerrar convocatoria" })).toBeVisible({ timeout: 20_000 });

    // ── 11. Armar y editar un equipo ────────────────────────────────────────
    await page.goto("/proyectos");
    await page.getByRole("button", { name: "Crear", exact: true }).click();
    await page.getByRole("button", { name: /Armar equipo/ }).click();
    await page.getByLabel("Título — por qué querés armar el equipo").fill(`Equipo formularios ${s}`);
    await page.getByRole("button", { name: "Armar equipo", exact: true }).click();
    await expect(page).toHaveURL(/\/equipos\/[^/]+$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Descripción (opcional)").fill("Un grupo para crear juntos.");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Un grupo para crear juntos.")).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await admin!.from("equipos").select("descripcion").eq("creador_id", nuevo.id).single()).data?.descripcion, { timeout: 15_000 }).toBe("Un grupo para crear juntos.");

    // ── 12. Buscar talento (texto) ──────────────────────────────────────────
    await page.goto(`/talentos?obra=${obraId}`);
    await page.getByRole("textbox", { name: "Buscar", exact: true }).fill("zzz-nadie-se-llama-asi");
    await expect(page.getByText("Sin coincidencias")).toBeVisible({ timeout: 15_000 });

    // ── 13. Denunciar un perfil ─────────────────────────────────────────────
    const otro = await admin!.auth.admin.createUser({ email: `e2e-${s}-otro@test.local`, password: PASS, email_confirm: true });
    usuarios.push(otro.data.user!.id);
    await admin!.from("perfiles_talento").insert({
      id: otro.data.user!.id, nombre: `Otro E2E ${s}`, fecha_nacimiento: "1990-01-01", ubicacion_texto: "x",
      ubicacion_publica: "Palermo", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR", genero: "sin_especificar",
    });
    await page.goto(`/talentos/${otro.data.user!.id}`);
    await page.getByRole("button", { name: "Denunciar" }).click();
    await page.getByLabel("Perfil falso o suplantación").check();
    await page.getByPlaceholder("Contanos qué pasó").fill("Prueba de formularios.");
    await page.getByRole("button", { name: /Enviar/ }).click();
    await expect(page.getByText("Recibimos tu denuncia")).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await admin!.from("denuncias").select("id").eq("perfil_denunciado_id", otro.data.user!.id)).data?.length ?? 0, { timeout: 15_000 }).toBe(1);

    // ── 14. Escribir en un chat ─────────────────────────────────────────────
    const { data: sala } = await admin!.from("salas").insert({ titulo: "Sala formularios", obra_id: obraId }).select("id").single();
    await admin!.from("sala_integrantes").insert([
      { sala_id: sala!.id, perfil_id: nuevo.id },
      { sala_id: sala!.id, perfil_id: otro.data.user!.id },
    ]);
    await page.goto(`/salas/${sala!.id}`);
    await page.getByPlaceholder("Escribí un mensaje…").fill("Hola, prueba de formularios");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Hola, prueba de formularios")).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await admin!.from("mensajes").select("contenido").eq("sala_id", sala!.id).eq("autor_id", nuevo.id)).data?.map((m) => m.contenido), { timeout: 15_000 }).toEqual(["Hola, prueba de formularios"]);

    // ── 15. Ajustes: tema e idioma ──────────────────────────────────────────
    await page.goto("/ajustes");
    await page.getByRole("button", { name: "Claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "light", { timeout: 10_000 });
    await page.getByRole("button", { name: "Oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-tema", "dark", { timeout: 10_000 });

    // ── 16. Cambiar la clave ────────────────────────────────────────────────
    const nueva = "otra-clave-5678";
    await page.goto("/cambiar-clave");
    await page.getByLabel("Contraseña nueva").fill(nueva);
    await page.getByLabel("Repetila").fill(nueva);
    await page.locator("form").getByRole("button").first().click();
    await page.waitForTimeout(3000);
    await page.context().clearCookies();
    await entrar(page, emailNuevo, nueva);
  });
});
