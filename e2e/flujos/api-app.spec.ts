import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barrerRestos, borrarUsuarios } from "./limpieza";

/**
 * Endpoints de la app nativa (#392, `src/app/api/app/…`): llegan sin cookies, con la sesión en
 * `Authorization: Bearer`, y actúan como esa persona.
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;
const ANON = process.env.E2E_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASS = "test-1234-abcd";

test.describe("endpoints de la app nativa", () => {
  test.skip(
    !URL || !KEY || !ANON || !process.env.E2E_BASE_URL,
    "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/anon key/E2E_BASE_URL (staging)",
  );

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const usuariosCreados: string[] = [];

  /** Una cuenta aprobada, sin las Normas aceptadas, y su token de sesión. */
  async function cuentaConToken() {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({ email, password: PASS, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("createUser sin usuario");
    usuariosCreados.push(data.user.id);
    await admin!.from("perfiles").update({ aprobado_en: new Date().toISOString() }).eq("id", data.user.id);
    const anon = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { data: ingreso, error: e } = await anon.auth.signInWithPassword({ email, password: PASS });
    if (e || !ingreso.session) throw e ?? new Error("sin sesión");
    return { id: data.user.id, token: ingreso.session.access_token };
  }

  test.beforeAll(async () => {
    await barrerRestos(admin!);
  });

  test.afterEach(async () => {
    await borrarUsuarios(admin!, usuariosCreados);
  });

  test("sin sesión responde 401", async ({ request }) => {
    expect((await request.post("/api/app/normas")).status()).toBe(401);
    const conBasura = await request.post("/api/app/borrar-cuenta", { headers: { Authorization: "Bearer no-es-un-token" } });
    expect(conBasura.status()).toBe(401);
  });

  test("acepta las Normas como esa persona", async ({ request }) => {
    const { id, token } = await cuentaConToken();
    const r = await request.post("/api/app/normas", { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status()).toBe(200);
    expect((await r.json()).ok).toBe(true);
    const { data } = await admin!.from("perfiles").select("normas_aceptadas_en").eq("id", id).single();
    expect(data?.normas_aceptadas_en).not.toBeNull();
  });

  test("borra la cuenta propia", async ({ request }) => {
    const { id, token } = await cuentaConToken();
    const r = await request.post("/api/app/borrar-cuenta", { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status()).toBe(200);
    const { data } = await admin!.auth.admin.getUserById(id);
    expect(data.user).toBeNull();
  });
});
