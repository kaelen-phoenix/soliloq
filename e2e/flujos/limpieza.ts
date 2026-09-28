import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Limpieza compartida de `flujos/`. Todos los usuarios de prueba son `e2e-…@test.local` y sus
 * fotos viven en `fotos-perfil/e2e/<uid>…png` (Storage no cascadea al borrar el usuario).
 *
 * Va en `afterEach`, no en `afterAll`: con `afterAll` los usuarios de un test que fallaba
 * quedaban vivos en staging, y como aparecen en `/talentos` de cualquier Creador, rompían
 * el siguiente `match.spec.ts` (la pila mostraba primero a "Admin E2E").
 *
 * Cualquier error de Supabase se tira (#220): antes se ignoraban y el hook terminaba "bien"
 * dejando basura en staging sin que nadie se enterara.
 */
const BUCKET = "fotos-perfil";
const CARPETA = "e2e";
const PAGINA = 1000;
/** Margen para no tocar lo de otro spec que esté corriendo en paralelo en este momento. */
const MARGEN_MS = 15 * 60_000;

type Archivo = { name: string; created_at: string | null };

async function listarFotos(admin: SupabaseClient): Promise<Archivo[]> {
  const archivos: Archivo[] = [];
  for (let offset = 0; ; offset += PAGINA) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(CARPETA, { limit: PAGINA, offset });
    if (error) throw error;
    archivos.push(...data);
    if (data.length < PAGINA) return archivos;
  }
}

async function listarUsuarios(admin: SupabaseClient): Promise<User[]> {
  const usuarios: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGINA });
    if (error) throw error;
    usuarios.push(...data.users);
    if (data.users.length < PAGINA) return usuarios;
  }
}

/** `remove` acepta hasta 1000 objetos por llamada: se borra por lotes. */
async function borrarFotos(admin: SupabaseClient, nombres: string[]) {
  for (let i = 0; i < nombres.length; i += PAGINA) {
    const { error } = await admin.storage
      .from(BUCKET)
      .remove(nombres.slice(i, i + PAGINA).map((n) => `${CARPETA}/${n}`));
    if (error) throw error;
  }
}

/** Borra los usuarios y sus fotos. Cada ID sale de `ids` recién cuando quedó limpio, así un
 *  fallo a mitad de camino no los pierde y el próximo intento los vuelve a probar. */
export async function borrarUsuarios(admin: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  const fotos = await listarFotos(admin);
  await borrarFotos(
    admin,
    fotos.filter((a) => ids.some((id) => a.name.startsWith(id))).map((a) => a.name),
  );
  for (const id of [...ids]) {
    const { error } = await admin.auth.admin.deleteUser(id);
    // 404: ya estaba borrado (p. ej. un intento anterior que falló después del delete).
    if (error && error.status !== 404) throw error;
    ids.splice(ids.indexOf(id), 1);
  }
}

/**
 * Barre restos de corridas que se cortaron a la mitad (proceso matado, sin hooks): usuarios
 * `@test.local` de más de 15 minutos, y fotos de `e2e/` cuyo dueño ya no existe (quedaban
 * para siempre: el filtro por ID de `borrarUsuarios` no las ve).
 */
export async function barrerRestos(admin: SupabaseClient) {
  const limite = Date.now() - MARGEN_MS;
  const usuarios = await listarUsuarios(admin);
  const viejos = usuarios
    .filter((u) => u.email?.endsWith("@test.local") && Date.parse(u.created_at) < limite)
    .map((u) => u.id);
  await borrarUsuarios(admin, [...viejos]);

  const vivos = new Set(usuarios.map((u) => u.id).filter((id) => !viejos.includes(id)));
  // Los nombres empiezan con el UUID del dueño (36 caracteres): `<uid>.png`, `<uid>-equipo-0.png`.
  const huerfanas = (await listarFotos(admin)).filter(
    (a) =>
      !vivos.has(a.name.slice(0, 36)) &&
      a.created_at !== null &&
      Date.parse(a.created_at) < limite,
  );
  await borrarFotos(admin, huerfanas.map((a) => a.name));
}
