import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Varios Proyectos a la vez (#330, 0101): una misma persona con dos Proyectos publicados y un
 * Equipo activo. Cada match ofrece, al convocar, los roles de su propio Proyecto.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const PASS = "test-1234-abcd";

test.describe("varios proyectos (UI)", () => {
  test.skip(!URL || !KEY, "requiere E2E_SUPABASE_URL y E2E_SERVICE_KEY (staging)");
  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuarios: string[] = [];

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuarios);
  });

  async function cuenta(nombre: string) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error) throw error;
    const id = data.user.id;
    usuarios.push(id);
    const ahora = new Date().toISOString();
    await admin!.from("perfiles").update({
      aprobado_en: ahora, normas_aceptadas_en: ahora, tour_talento_visto_en: ahora, tour_creador_visto_en: ahora,
    }).eq("id", id);
    const { error: e2 } = await admin!.from("perfiles_talento").insert({
      id, nombre, fecha_nacimiento: "1990-01-01", ubicacion_texto: "Buenos Aires, Argentina", ubicacion_publica: "Palermo",
      ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR", genero: "sin_especificar", onboarding_visto_en: ahora,
    });
    if (e2) throw e2;
    return { id, email };
  }

  async function obra(creadorId: string, titulo: string, roles: string[]) {
    const { data, error } = await admin!.from("obras").insert({
      creador_id: creadorId, titulo, estado: "publicada",
      ubicacion_texto: "Buenos Aires, Argentina", ubicacion_lat: -34.6, ubicacion_lng: -58.4, ubicacion_pais: "AR",
    }).select("id").single();
    if (error) throw error;
    const { error: e2 } = await admin!.from("roles").insert(
      roles.map((nombre) => ({ obra_id: data.id, nombre, tipo: "actuacion", vacantes: 1 })),
    );
    if (e2) throw e2;
    return data.id as string;
  }

  test("dos proyectos y un equipo a la vez; cada match ofrece los roles de su proyecto", async ({ page }) => {
    const s = Date.now();
    const creadora = await cuenta(`Creadora Varios ${s}`);
    const t1 = await cuenta(`Talento Uno ${s}`);
    const t2 = await cuenta(`Talento Dos ${s}`);
    const obraA = await obra(creadora.id, `Proyecto A ${s}`, ["Rol A1", "Rol A2"]);
    const obraB = await obra(creadora.id, `Proyecto B ${s}`, ["Rol B1", "Rol B2"]);
    // Un Equipo activo además de los dos Proyectos publicados: antes lo impedía un trigger.
    const { error: eEq } = await admin!.from("equipos").insert({ creador_id: creadora.id, titulo: `Equipo ${s}`, cupo: null });
    if (eEq) throw eEq;

    // Match de T1 con A y de T2 con B.
    for (const [t, o] of [[t1.id, obraA], [t2.id, obraB]] as const) {
      const { error } = await admin!.from("intereses_match").insert([
        { de_perfil: t, a_perfil: creadora.id, obra_id: o, interesa: true },
        { de_perfil: creadora.id, a_perfil: t, obra_id: o, interesa: true },
      ]);
      if (error) throw error;
    }
    await admin!.from("matches").update({ mostrado_en: new Date().toISOString() }).eq("creador_id", creadora.id);

    await page.goto("/ingresar");
    await page.getByLabel("Tu email").fill(creadora.email);
    await page.getByLabel("Contraseña").fill(PASS);
    await page.locator("form").getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), { timeout: 30_000 });

    // El tablero muestra los dos Proyectos y el Equipo.
    await page.goto("/proyectos");
    await expect(page.getByText(`Proyecto A ${s}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Proyecto B ${s}`)).toBeVisible();
    await page.getByRole("tab", { name: "Armar equipo" }).click();
    await expect(page.getByText(`Equipo ${s}`)).toBeVisible();

    // Convocar a T2 ofrece los roles de B, no los de A.
    await page.goto("/matches");
    const fila = page.locator("li", { hasText: `Talento Dos ${s}` });
    await expect(fila).toBeVisible({ timeout: 15_000 });
    await fila.getByRole("button", { name: "Convocar" }).click();
    const elegir = page.getByRole("dialog", { name: "Elegir rol" });
    await expect(elegir.getByRole("button", { name: "Rol B1" })).toBeVisible({ timeout: 10_000 });
    await expect(elegir.getByRole("button", { name: "Rol A1" })).toHaveCount(0);
    await elegir.getByRole("button", { name: "Rol B2" }).click();
    await expect.poll(async () => {
      const { data } = await admin!
        .from("convocatorias")
        .select("rol_id, roles(nombre)")
        .eq("estado", "pendiente")
        .in("match_id", (await admin!.from("matches").select("id").eq("talento_id", t2.id)).data!.map((m) => m.id));
      return (data?.[0] as { roles?: { nombre?: string } } | undefined)?.roles?.nombre ?? null;
    }, { timeout: 15_000 }).toBe("Rol B2");
  });
});
