"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/", "layout");
  redirect(destinoSeguro(next));
}
