"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarNormasAceptadas } from "@/lib/normas-servidor";

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

  // Lo mismo que hace la app nativa (`/api/app/normas`).
  await registrarNormasAceptadas(supabase, user.id);

  revalidatePath("/", "layout");
  redirect(destinoSeguro(next));
}
