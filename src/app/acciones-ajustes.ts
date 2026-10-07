"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
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
 * «Ver el recorrido de nuevo» (#231): borra la marca del tour y vuelve a la pantalla
 * principal, donde el tour arranca solo.
 */
export async function volverAVerTour() {
  const { supabase, user } = await usuario();
  const { error } = await supabase
    .from("perfiles")
    .update({ tour_talento_visto_en: null })
    .eq("id", user.id);
  // Si no se pudo borrar la marca, ir a `/` no mostraría nada: se queda en Ajustes.
  if (error) {
    reportarErrorSupabase(error, { accion: "volver a ver el tour" });
    return;
  }
  revalidatePath("/", "layout");
  redirect("/?tour=1");
}

/**
 * Borra la cuenta propia y todo lo que cuelga de ella. Irreversible.
 * La cascada y la limpieza de Storage viven en `borrarUsuarioYArchivos`.
 */
export async function borrarCuenta(): Promise<{ ok: boolean }> {
  const { supabase, user } = await usuario();

  // Si falla, se devuelve el error en vez de tirar: una excepción en la server action dejaba
  // la pantalla trabada en «Borrando…» sin decir nada (#229).
  try {
    await borrarUsuarioYArchivos(user.id);
  } catch (e) {
    Sentry.captureException(e, { tags: { origen: "borrar-cuenta" } });
    // El texto lo pone el cliente, en el idioma de quien lo ve.
    return { ok: false };
  }

  // La sesión ya quedó huérfana; alcanza con limpiar las cookies de este dispositivo.
  await supabase.auth.signOut({ scope: "local" });
  // A la portada va el cliente, con una navegación completa: un `redirect()` desde una server
  // action arma la página destino sin pasar por el middleware, y la portada en el idioma de
  // cada quien la resuelve el middleware (#237).
  return { ok: true };
}
