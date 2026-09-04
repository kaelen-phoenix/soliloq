"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UN_AÑO = 60 * 60 * 24 * 365;

async function usuario() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");
  return { supabase, user };
}

export async function guardarIdioma(idioma: "es" | "en") {
  const { supabase, user } = await usuario();
  await supabase.from("perfiles").update({ idioma }).eq("id", user.id);
  cookies().set("NEXT_LOCALE", idioma, { maxAge: UN_AÑO, sameSite: "lax", path: "/" });
  // Re-renderiza todo el árbol con los mensajes del idioma nuevo.
  revalidatePath("/", "layout");
}

export async function guardarTema(tema: "sistema" | "claro" | "oscuro") {
  const { supabase, user } = await usuario();
  await supabase.from("perfiles").update({ tema }).eq("id", user.id);
  cookies().set("tema", tema, { maxAge: UN_AÑO, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

/**
 * Borra la cuenta y todo lo que cuelga de ella. Irreversible.
 *
 * `auth.admin.deleteUser` borra la fila de `auth.users`; de ahí en cascada se van
 * `perfiles` y todo lo demás (perfil de talento/creador, obras y su árbol, salas,
 * mensajes, notificaciones, denuncias, bloqueos…). Lo único que no cascadea es el
 * Storage, así que se limpia a mano el árbol del uid en `fotos-perfil`.
 */
export async function borrarCuenta() {
  const { supabase, user } = await usuario();
  const admin = createAdminClient();

  await borrarArbolStorage(admin, "fotos-perfil", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);

  // La sesión ya quedó huérfana; alcanza con limpiar las cookies de este dispositivo.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/bienvenida");
}

/** Borra recursivamente todo lo que haya bajo `prefijo/` en el bucket. Best-effort. */
async function borrarArbolStorage(
  admin: SupabaseClient,
  bucket: string,
  prefijo: string
) {
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
