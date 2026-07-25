"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/supabase/types";

export async function conmutarModo(modo: RolUsuario) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  await supabase.from("perfiles").update({ modo_activo: modo }).eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/");
}
