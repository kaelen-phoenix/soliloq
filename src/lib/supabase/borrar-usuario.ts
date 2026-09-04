import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";

/**
 * Borra un usuario y todo lo que cuelga de él. Irreversible. Solo server.
 *
 * `auth.admin.deleteUser` borra la fila de `auth.users`; de ahí en cascada se van
 * `perfiles` y todo lo demás (perfil de talento/creador, obras y su árbol, salas,
 * mensajes, notificaciones, denuncias, bloqueos…). Lo único que no cascadea es el
 * Storage, así que antes se limpia a mano el árbol del uid en `fotos-perfil`.
 *
 * No verifica permisos: quien llama tiene que haberse asegurado de que puede
 * (el propio usuario en Ajustes, o un admin en el panel).
 */
export async function borrarUsuarioYArchivos(userId: string) {
  const admin = createAdminClient();

  await borrarArbolStorage(admin, "fotos-perfil", userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);
}

/** Borra recursivamente todo lo que haya bajo `prefijo/` en el bucket. Best-effort. */
async function borrarArbolStorage(admin: SupabaseClient, bucket: string, prefijo: string) {
  const { data, error } = await admin.storage.from(bucket).list(prefijo, { limit: 1000 });
  if (error || !data) return;

  const archivos: string[] = [];
  for (const item of data) {
    const ruta = `${prefijo}/${item.name}`;
    // Una "carpeta" en Storage viene sin `id`; un archivo real lo trae.
    if (item.id == null) await borrarArbolStorage(admin, bucket, ruta);
    else archivos.push(ruta);
  }
  if (archivos.length > 0) await admin.storage.from(bucket).remove(archivos);
}
