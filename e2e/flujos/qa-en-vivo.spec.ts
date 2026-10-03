import { test, expect, devices, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * La "caminata en vivo" de #122, en teléfono (Pixel 7) y contra staging: lo que el checklist
 * pedía verificar a mano y que `match.spec.ts` / `equipo-admin-notificaciones.spec.ts` /
 * `salas-no-leidos.spec.ts` / `eliminar-equipo.spec.ts` no cubren. Cada test siembra lo que
 * necesita con el cliente admin y navega solo la parte que se prueba.
 *
 * Del checklist original quedaron fuera, a propósito:
 *  - push real en el teléfono e ícono de la PWA reinstalada: necesitan un dispositivo;
 *  - el banner de "cupo lleno": ya no existe — el cupo se ve como "Cupo lleno" en cada match
 *    nuevo (test 1);
 *  - la biografía del Creador (#132): se eliminó en 0077 (#175).
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

test.use({ ...devices["Pixel 7"] });

test.describe("QA en vivo (#122, teléfono)", () => {
  test.skip(
    !URL || !KEY || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];
  const sufijo = () => Math.random().toString(36).slice(2, 8);

  /** Resultado de Supabase o excepción: sin error y sin datos vacíos (los tipos quedan no nulos). */
  async function ok<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
    const { data, error } = await p;
    if (error) throw error;
    if (data === null || data === undefined) throw new Error("Supabase devolvió datos vacíos");
    return data as NonNullable<T>;
  }

  /** Escritura sin `.select()` (no devuelve filas): solo importa que no haya error. */
  async function hecho(p: PromiseLike<{ error: unknown }>) {
    const { error } = await p;
    if (error) throw error;
  }

  async function subirFoto(path: string) {
    const { error } = await admin!.storage
      .from("fotos-perfil")
      .upload(path, PNG_1X1, { contentType: "image/png", upsert: true });
    if (error) throw error;
  }

  /** Cuenta aprobada, con Normas y Perfil de Talento (el único "personal", #175). */
  async function nuevoUsuario(
    nombre: string,
    modo: "talento" | "creador",
    opciones: { esAdmin?: boolean; fotos?: number; enlacePublico?: boolean } = {},
  ) {
    const email = `e2e-${Date.now()}-${sufijo()}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    const id = data.user.id;
    usuariosCreados.push(id);
    await hecho(
      admin!
        .from("perfiles")
        .update({
          aprobado_en: new Date().toISOString(),
          normas_aceptadas_en: new Date().toISOString(),
          // El tour guiado (#231) taparía la pantalla: los tests que no lo prueban lo dan por visto.
          tour_talento_visto_en: new Date().toISOString(),
          tour_creador_visto_en: new Date().toISOString(),
          modo_activo: modo,
          es_admin: opciones.esAdmin ?? false,
          enlace_publico_activo: opciones.enlacePublico ?? false,
        })
        .eq("id", id),
    );
    await hecho(
      admin!.from("perfiles_talento").insert({
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
      }),
    );
    for (let orden = 0; orden < (opciones.fotos ?? 1); orden++) {
      const path = `e2e/${id}-${orden}.png`;
      await subirFoto(path);
      await hecho(admin!.from("fotos_talento").insert({ talento_id: id, storage_path: path, orden }));
    }
    return { id, email, nombre };
  }

  /** Obra con un rol (cupo = vacantes) y una foto. `perfiles_creador` lo crea el trigger de 0075. */
  async function nuevaObra(
    creadorId: string,
    titulo: string,
    opciones: { vacantes?: number; estado?: "publicada" | "borrador" } = {},
  ) {
    const obra = await ok(
      admin!
        .from("obras")
        .insert({
          creador_id: creadorId,
          titulo,
          estado: opciones.estado ?? "publicada",
          ubicacion_texto: "Buenos Aires, Argentina",
          ubicacion_lat: LAT,
          ubicacion_lng: LNG,
          ubicacion_pais: "AR",
        })
        .select("id")
        .single(),
    );
    const rol = await ok(
      admin!
        .from("roles")
        .insert({
          obra_id: obra.id,
          nombre: "Protagonista",
          tipo: "actuacion",
          vacantes: opciones.vacantes ?? 1,
        })
        .select("id")
        .single(),
    );
    const path = `e2e/${creadorId}-obra-${obra.id.slice(0, 8)}.png`;
    await subirFoto(path);
    await hecho(admin!.from("fotos_obra").insert({ obra_id: obra.id, storage_path: path, orden: 0 }));
    return { obraId: obra.id as string, rolId: rol.id as string };
  }

  /** Match aceptado + convocatoria aceptada + sala con los dos adentro (el final del circuito). */
  async function talentoEnSala(creadorId: string, talentoId: string, obraId: string, rolId: string) {
    const match = await ok(
      admin!
        .from("matches")
        .insert({
          creador_id: creadorId,
          talento_id: talentoId,
          obra_id: obraId,
          aceptado_en: new Date().toISOString(),
          mostrado_en: new Date().toISOString(),
        })
        .select("id")
        .single(),
    );
    const conv = await ok(
      admin!
        .from("convocatorias")
        .insert({ match_id: match.id, estado: "aceptada", rol_id: rolId, respondido_en: new Date().toISOString() })
        .select("id")
        .single(),
    );
    let { data: sala } = await admin!.from("salas").select("id").eq("obra_id", obraId).maybeSingle();
    if (!sala) {
      sala = await ok(admin!.from("salas").insert({ obra_id: obraId }).select("id").single());
      await hecho(admin!.from("sala_integrantes").insert({ sala_id: sala!.id, perfil_id: creadorId }));
    }
    await hecho(admin!.from("sala_integrantes").insert({ sala_id: sala!.id, perfil_id: talentoId }));
    return { matchId: match!.id as string, convocatoriaId: conv!.id as string, salaId: sala!.id as string };
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
    // 30 s: staging (plan free) tiene picos de latencia en el login.
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });
  }

  test("Matches: con el cupo lleno, un match nuevo muestra «Cupo lleno» y no se puede aceptar", async ({
    page,
  }) => {
    const s = sufijo();
    const creador = await nuevoUsuario(`Creadora Cupo ${s}`, "creador");
    const adentro = await nuevoUsuario(`Talento Adentro ${s}`, "talento");
    const nuevo = await nuevoUsuario(`Talento Nuevo ${s}`, "talento");
    const { obraId } = await nuevaObra(creador.id, `Obra cupo ${s}`, { vacantes: 1 });
    // El único lugar ya está tomado por un match aceptado (así cuenta el cupo desde 0063).
    await hecho(
      admin!.from("matches").insert([
        {
          creador_id: creador.id,
          talento_id: adentro.id,
          obra_id: obraId,
          aceptado_en: new Date().toISOString(),
          mostrado_en: new Date().toISOString(),
        },
        { creador_id: creador.id, talento_id: nuevo.id, obra_id: obraId, mostrado_en: new Date().toISOString() },
      ]),
    );

    await login(page, creador.email);
    await page.goto("/matches");
    const fila = page.locator("li", { hasText: nuevo.nombre });
    await expect(fila).toBeVisible({ timeout: 15_000 });
    await expect(fila.getByRole("button", { name: "Cupo lleno" })).toBeDisabled();
    await expect(fila.getByRole("button", { name: "Aceptar" })).toHaveCount(0);
  });

  test("Convocados: «Dar de baja» saca al Talento de la sala y libera el lugar", async ({ page }) => {
    const s = sufijo();
    const creador = await nuevoUsuario(`Creadora Baja ${s}`, "creador");
    const talento = await nuevoUsuario(`Talento Baja ${s}`, "talento");
    const { obraId, rolId } = await nuevaObra(creador.id, `Obra baja ${s}`);
    const { convocatoriaId, salaId } = await talentoEnSala(creador.id, talento.id, obraId, rolId);

    await login(page, creador.email);
    await page.goto("/matches");
    const fila = page.locator("li", { hasText: talento.nombre });
    await expect(fila.getByText("En la sala")).toBeVisible({ timeout: 15_000 });
    await fila.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText(`¿Dar de baja a ${talento.nombre}?`)).toBeVisible();
    await page.getByRole("button", { name: "Dar de baja" }).last().click();

    await expect
      .poll(async () => {
        const { data } = await admin!
          .from("sala_integrantes")
          .select("perfil_id")
          .eq("sala_id", salaId)
          .eq("perfil_id", talento.id);
        return data?.length;
      }, { timeout: 15_000 })
      .toBe(0);
    const conv = await ok(
      admin!.from("convocatorias").select("estado").eq("id", convocatoriaId).single(),
    );
    expect(conv!.estado).toBe("baja");
  });

  test("Feed: no vuelve a mostrar una obra en cuya sala el Talento ya está", async ({ page }) => {
    const s = sufijo();
    const creadorA = await nuevoUsuario(`Creadora Adentro ${s}`, "creador");
    const creadorB = await nuevoUsuario(`Creadora Otra ${s}`, "creador");
    const talento = await nuevoUsuario(`Talento Feed ${s}`, "talento");
    const obraAdentro = await nuevaObra(creadorA.id, `Obra donde ya entró ${s}`);
    await nuevaObra(creadorB.id, `Obra nueva ${s}`);
    await talentoEnSala(creadorA.id, talento.id, obraAdentro.obraId, obraAdentro.rolId);

    await login(page, talento.email);
    await page.goto("/");
    await expect(page.getByText(`Obra nueva ${s}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Obra donde ya entró ${s}`)).toHaveCount(0);
  });

  test("Estados vacíos: Matches sin matches y /convocatoria sin convocatorias", async ({ page }) => {
    const s = sufijo();
    const creador = await nuevoUsuario(`Creadora Vacía ${s}`, "creador");
    await nuevaObra(creador.id, `Obra vacía ${s}`);
    const talento = await nuevoUsuario(`Talento Vacío ${s}`, "talento");

    await login(page, creador.email);
    await page.goto("/matches");
    await expect(page.getByText("Todavía nadie para convocar")).toBeVisible({ timeout: 15_000 });

    await page.context().clearCookies();
    await login(page, talento.email);
    await page.goto("/convocatoria");
    await expect(page.getByText("No tenés convocatorias pendientes")).toBeVisible({ timeout: 15_000 });
  });

  test("Chats: destacar una sala y después desvincularse", async ({ page }) => {
    const s = sufijo();
    const creador = await nuevoUsuario(`Creadora Sala ${s}`, "creador");
    const talento = await nuevoUsuario(`Talento Sala ${s}`, "talento");
    const titulo = `Obra con sala ${s}`;
    const { obraId, rolId } = await nuevaObra(creador.id, titulo);
    const { salaId } = await talentoEnSala(creador.id, talento.id, obraId, rolId);

    await login(page, talento.email);
    await page.goto("/salas");
    const tarjeta = page.locator("li", { hasText: titulo });
    await expect(tarjeta).toBeVisible({ timeout: 15_000 });

    await tarjeta.getByRole("button", { name: "Opciones del chat" }).click();
    await page.getByRole("button", { name: "Destacar" }).click();
    await expect
      .poll(async () => {
        const { data } = await admin!
          .from("chats_destacados")
          .select("sala_id")
          .eq("perfil_id", talento.id)
          .eq("sala_id", salaId);
        return data?.length;
      }, { timeout: 10_000 })
      .toBe(1);

    await tarjeta.getByRole("button", { name: "Opciones del chat" }).click();
    await page.getByRole("button", { name: "Desvincularme" }).click();
    await expect(page.getByText(`¿Seguro que querés desvincularte de «${titulo}»?`)).toBeVisible();
    await page.getByRole("button", { name: "Aceptar" }).click();
    await expect(page.locator("li", { hasText: titulo })).toHaveCount(0, { timeout: 10_000 });
    const { data: sigue } = await admin!
      .from("sala_integrantes")
      .select("perfil_id")
      .eq("sala_id", salaId)
      .eq("perfil_id", talento.id);
    expect(sigue).toHaveLength(0);
  });

  test("Perfil: ocultar la edad la saca también del enlace público", async ({ page, browser }) => {
    // Recorre dos sesiones y edita el perfil: con staging lento y otros specs en paralelo,
    // 30 s no alcanzaba (#285).
    test.setTimeout(60_000);
    const s = sufijo();
    // 3 fotos: el formulario del perfil no guarda con menos ("Cargá al menos 3 fotos").
    const talento = await nuevoUsuario(`Talento Edad ${s}`, "talento", { enlacePublico: true, fotos: 3 });
    const { enlace_token } = (await ok(
      admin!.from("perfiles").select("enlace_token").eq("id", talento.id).single(),
    ))!;
    const anonimo = await browser.newPage();
    await anonimo.goto(`/p/${enlace_token}`);
    await expect(anonimo.getByText(/\d+ años/)).toBeVisible({ timeout: 15_000 });

    await login(page, talento.email);
    await page.goto("/perfil?editar=1");
    await page.getByRole("switch", { name: "Tu edad se muestra en tu perfil" }).click();
    await expect(page.getByRole("switch", { name: "Tu edad está oculta en tu perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect
      .poll(async () => {
        const { data } = await admin!
          .from("perfiles_talento")
          .select("edad_visible")
          .eq("id", talento.id)
          .single();
        return data?.edad_visible;
      }, { timeout: 15_000 })
      .toBe(false);

    await anonimo.reload();
    await expect(anonimo.getByText(talento.nombre).first()).toBeVisible({ timeout: 15_000 });
    await expect(anonimo.getByText(/\d+ años/)).toHaveCount(0);
    await anonimo.close();
  });

  test("Editar perfil con Talento y Creador: un solo «Guardar cambios» guarda las dos partes", async ({
    page,
  }) => {
    const s = sufijo();
    const cuenta = await nuevoUsuario(`Doble Rol ${s}`, "talento", { fotos: 3 });
    await hecho(
      admin!.from("perfiles_creador").insert({ id: cuenta.id, disciplinas: ["actuacion"] }),
    );

    await login(page, cuenta.email);
    await page.goto("/perfil?editar=1");
    // #234: antes había dos formularios, cada uno con su «Guardar cambios».
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(1);

    // Un cambio de cada parte, y un solo guardado.
    await page.getByRole("switch", { name: "Tu edad se muestra en tu perfil" }).click();
    await page
      .getByRole("group", { name: /Perfil artístico como Creador/ })
      .getByRole("button", { name: "Dirección", exact: true })
      .click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect
      .poll(
        async () => {
          const [{ data: t }, { data: c }] = await Promise.all([
            admin!.from("perfiles_talento").select("edad_visible").eq("id", cuenta.id).single(),
            admin!.from("perfiles_creador").select("disciplinas").eq("id", cuenta.id).single(),
          ]);
          return { edadVisible: t?.edad_visible, disciplinas: [...(c?.disciplinas ?? [])].sort() };
        },
        { timeout: 15_000 },
      )
      .toEqual({ edadVisible: false, disciplinas: ["actuacion", "direccion"] });
  });

  test("Editar perfil con menos de 3 fotos: guarda igual y avisa", async ({ page }) => {
    // #243: la regla de 3 fotos es para el alta; al editar, trabar el guardado dejaba a
    // cuentas viejas (1 foto) sin poder cambiar nada y sin ver por qué.
    const cuenta = await nuevoUsuario(`Una Foto ${sufijo()}`, "talento", { fotos: 1 });
    await hecho(
      admin!.from("perfiles_creador").insert({ id: cuenta.id, disciplinas: ["actuacion"] }),
    );

    await login(page, cuenta.email);
    await page.goto("/perfil?editar=1");
    await expect(page.getByText("Te recomendamos 3 fotos o más")).toBeVisible();
    await page
      .getByRole("group", { name: /Perfil artístico como Creador/ })
      .getByRole("button", { name: "Dirección", exact: true })
      .click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect
      .poll(
        async () =>
          [
            ...((
              await admin!.from("perfiles_creador").select("disciplinas").eq("id", cuenta.id).single()
            ).data?.disciplinas ?? []),
          ].sort(),
        { timeout: 15_000 },
      )
      .toEqual(["actuacion", "direccion"]);
  });

  test("Editar perfil: un Creador sin disciplinas cargadas puede guardar igual", async ({ page }) => {
    // La fila de Creador la crea un trigger sin disciplinas (0075): unificar el formulario no
    // puede dejar a esas cuentas sin poder guardar el resto del perfil (#234).
    const cuenta = await nuevoUsuario(`Creador Sin Disciplinas ${sufijo()}`, "talento", { fotos: 3 });
    await hecho(admin!.from("perfiles_creador").insert({ id: cuenta.id }));

    await login(page, cuenta.email);
    await page.goto("/perfil?editar=1");
    await page.getByRole("switch", { name: "Tu edad se muestra en tu perfil" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect
      .poll(
        async () =>
          (await admin!.from("perfiles_talento").select("edad_visible").eq("id", cuenta.id).single())
            .data?.edad_visible,
        { timeout: 15_000 },
      )
      .toBe(false);
  });

  test("Visor de fotos: se pasa de foto deslizando con el dedo", async ({ page }) => {
    const s = sufijo();
    const talento = await nuevoUsuario(`Talento Fotos ${s}`, "talento", { fotos: 3 });

    await login(page, talento.email);
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Ampliar foto 1 de 3" }).click();
    const visor = page.getByRole("dialog", { name: "Foto ampliada" });
    await expect(visor.getByText("1 / 3")).toBeVisible();

    // El visor arrastra con `drag="x"` de framer-motion (eventos de puntero): basta un
    // gesto hacia la izquierda de más de 60px, como el de un dedo.
    const caja = await visor.locator("img").first().boundingBox();
    if (!caja) throw new Error("sin imagen en el visor");
    const y = caja.y + caja.height / 2;
    await page.mouse.move(caja.x + caja.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(caja.x + caja.width * 0.5, y, { steps: 5 });
    await page.mouse.move(caja.x + caja.width * 0.1, y, { steps: 5 });
    await page.mouse.up();
    await expect(visor.getByText("2 / 3")).toBeVisible({ timeout: 5_000 });
  });

  test("Ajustes: «Borrar mi cuenta» borra la cuenta y cierra la sesión", async ({ page }) => {
    const talento = await nuevoUsuario(`Talento Se Va ${sufijo()}`, "talento");

    await login(page, talento.email);
    await page.goto("/ajustes");
    await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
    await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
    await page.getByRole("button", { name: "Borrar mi cuenta" }).last().click();
    await page.waitForURL(/\/bienvenida/, { timeout: 20_000 });

    const { data } = await admin!.auth.admin.getUserById(talento.id);
    expect(data.user).toBeNull();
  });

  test("Proyecto: «Borrar proyecto» lo borra con confirmación", async ({ page }) => {
    const s = sufijo();
    const creador = await nuevoUsuario(`Creadora Borra ${s}`, "creador");
    const { obraId } = await nuevaObra(creador.id, `Obra a borrar ${s}`);

    await login(page, creador.email);
    await page.goto(`/obras/${obraId}`);
    await page.getByRole("button", { name: "Borrar proyecto" }).click();
    await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
    await page.getByRole("button", { name: "Borrar definitivamente" }).click();
    await page.waitForURL((u) => u.pathname === "/proyectos", { timeout: 15_000 });

    const { data } = await admin!.from("obras").select("id").eq("id", obraId);
    expect(data).toHaveLength(0);
  });

  test("Admin: borrar un usuario desde el panel", async ({ page }) => {
    const s = sufijo();
    const cuentaAdmin = await nuevoUsuario(`Admin QA ${s}`, "talento", { esAdmin: true });
    const victima = await nuevoUsuario(`Victima QA ${s}`, "talento");

    await login(page, cuentaAdmin.email);
    await page.goto("/admin");
    await page.getByRole("button", { name: "usuarios" }).click();
    await page.getByPlaceholder("Nombre o email").fill(victima.nombre);
    const fila = page.locator("li", { hasText: victima.nombre });
    await expect(fila).toBeVisible({ timeout: 15_000 });
    await fila.getByRole("button", { name: "Borrar" }).click();
    await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
    await page.getByRole("button", { name: "Borrar definitivamente" }).click();

    await expect
      .poll(async () => (await admin!.auth.admin.getUserById(victima.id)).data.user, {
        timeout: 15_000,
      })
      .toBeNull();
  });

  test("Límite diario: el «Me interesa» número 21 avisa y no postula", async ({ page }) => {
    test.setTimeout(90_000);
    const s = sufijo();
    const creadorLleno = await nuevoUsuario(`Creadora Veinte ${s}`, "creador");
    const creadorFeed = await nuevoUsuario(`Creadora Feed ${s}`, "creador");
    const talento = await nuevoUsuario(`Talento Límite ${s}`, "talento");
    // 20 «Me interesa» del día (cada uno a una iniciativa distinta, como exige el índice único).
    // Obras en borrador, de una sola inserción: no necesitan rol ni foto para esto.
    const obras = (await ok(
      admin!
        .from("obras")
        .insert(
          Array.from({ length: 20 }, (_, i) => ({
            creador_id: creadorLleno.id,
            titulo: `Obra ${i} ${s}`,
            estado: "borrador",
            ubicacion_texto: "Buenos Aires, Argentina",
            ubicacion_lat: LAT,
            ubicacion_lng: LNG,
            ubicacion_pais: "AR",
          })),
        )
        .select("id"),
    ))!;
    await hecho(
      admin!.from("intereses_match").insert(
        obras.map((o) => ({
          de_perfil: talento.id,
          a_perfil: creadorLleno.id,
          obra_id: o.id,
          interesa: true,
        })),
      ),
    );
    const { obraId } = await nuevaObra(creadorFeed.id, `Obra 21 ${s}`);

    await login(page, talento.email);
    await page.goto("/");
    await expect(page.getByText(`Obra 21 ${s}`)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Postularme" }).click();
    await expect(
      page.getByText("Llegaste al límite de 20 «Me interesa» por hoy. Probá más tarde."),
    ).toBeVisible({ timeout: 10_000 });
    const { data } = await admin!
      .from("intereses_match")
      .select("id")
      .eq("de_perfil", talento.id)
      .eq("obra_id", obraId);
    expect(data).toHaveLength(0);
  });
});
