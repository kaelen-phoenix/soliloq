"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { borrarUsuarioYArchivos } from "@/lib/supabase/borrar-usuario";

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
 * Borra la cuenta propia y todo lo que cuelga de ella. Irreversible.
 * La cascada y la limpieza de Storage viven en `borrarUsuarioYArchivos`.
 */
export async function borrarCuenta() {
  const { supabase, user } = await usuario();

  await borrarUsuarioYArchivos(user.id);

  // La sesión ya quedó huérfana; alcanza con limpiar las cookies de este dispositivo.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/bienvenida");
}
