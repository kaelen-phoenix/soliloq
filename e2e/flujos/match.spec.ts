import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Flujo de match end to end en la UI. NECESITA un proyecto Supabase de **staging** (nunca
 * prod) apuntado por env: `E2E_SUPABASE_URL`, `E2E_SERVICE_KEY`, y `E2E_BASE_URL` con la
 * app corriendo contra esa base. Si falta algo, se saltea.
 *
 * El circuito ya está cubierto a nivel SQL en `supabase/tests/match_convocatoria.sql`;
 * esto valida la capa de UI (swipe, placa, /matches, /convocado).
 */
const URL = process.env.E2E_SUPABASE_URL;
const KEY = process.env.E2E_SERVICE_KEY;

test.describe("circuito de match (UI)", () => {
  test.skip(!URL || !KEY || !process.env.E2E_BASE_URL, "faltan E2E_SUPABASE_URL/E2E_SERVICE_KEY/E2E_BASE_URL (staging)");

  const admin = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
  const creados: string[] = [];

  async function nuevoUsuario(pass = "test-1234-abcd") {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const { data, error } = await admin!.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
    });
    if (error) throw error;
    creados.push(data.user.id);
    return { id: data.user.id, email, pass };
  }

  test.afterAll(async () => {
    for (const id of creados) await admin?.auth.admin.deleteUser(id).catch(() => {});
  });

  test("creador y talento hacen match, convocatoria y llegan a la sala", async ({ page }) => {
    // TODO cuando haya staging:
    //  1. nuevoUsuario() x2; completar perfil de creador (con obra + rol) y de talento (con fotos)
    //     — o sembrar directo con `admin` para no depender de todo el onboarding.
    //  2. login del talento por /ingresar, ir a "/", swipe derecha sobre la obra.
    //  3. login del creador, /talentos, swipe ❤️ sobre el talento → placa "Hay interés".
    //  4. "Enviar a Convocados" → el talento aparece en /matches como convocado.
    //  5. login del talento, /convocado → "Aceptar" → queda en /salas y el chat funciona.
    expect(admin).not.toBeNull();
  });
});
