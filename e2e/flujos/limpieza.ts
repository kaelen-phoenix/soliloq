import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limpieza compartida de `flujos/`. Todos los usuarios de prueba son `e2e-…@test.local` y sus
 * fotos viven en `fotos-perfil/e2e/<uid>…png` (Storage no cascadea al borrar el usuario).
 *
 * Va en `afterEach`, no en `afterAll`: con `afterAll` los usuarios de un test que fallaba
 * quedaban vivos en staging, y como aparecen en `/talentos` de cualquier Creador, rompían
 * el siguiente `match.spec.ts` (la pila mostraba primero a "Admin E2E").
 */
export async function borrarUsuarios(admin: SupabaseClient, ids: string[]) {
  const ids_ = ids.splice(0);
  if (ids_.length === 0) return;
  const { data: archivos } = await admin.storage.from("fotos-perfil").list("e2e", { limit: 1000 });
  const rutas = (archivos ?? [])
    .filter((a) => ids_.some((id) => a.name.startsWith(id)))
    .map((a) => `e2e/${a.name}`);
  if (rutas.length > 0) await admin.storage.from("fotos-perfil").remove(rutas);
  for (const id of ids_) await admin.auth.admin.deleteUser(id);
}

/**
 * Barre restos de corridas que se cortaron a la mitad (proceso matado, sin hooks): usuarios
 * `@test.local` de más de 15 minutos. El margen evita borrar los de otro spec que esté
 * corriendo en paralelo en este momento.
 */
export async function barrerRestos(admin: SupabaseClient) {
  const limite = Date.now() - 15 * 60_000;
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const viejos = data.users
    .filter((u) => u.email?.endsWith("@test.local") && Date.parse(u.created_at) < limite)
    .map((u) => u.id);
  await borrarUsuarios(admin, viejos);
}
