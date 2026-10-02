"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enviarBienvenidasPendientes } from "@/lib/bienvenida-servidor";

/** Solo destinos internos: sin esto, `next` sería un redirect abierto. */
function destinoSeguro(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function aceptarNormas(next?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  await supabase.from("perfiles").update({ normas_aceptadas_en: new Date().toISOString() }).eq("id", user.id);

  // Toda cuenta pasa por acá una sola vez, apenas puede entrar: es el momento del mail de
  // bienvenida (#272). Si falla no frena la entrada: queda pendiente y sale con el envío
  // del panel.
  try {
    await enviarBienvenidasPendientes({ soloPerfil: user.id });
  } catch {
    // sigue
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguro(next));
}
