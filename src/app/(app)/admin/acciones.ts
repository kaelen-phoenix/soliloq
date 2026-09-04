"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { borrarUsuarioYArchivos } from "@/lib/supabase/borrar-usuario";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Borra una cuenta desde el panel de admin. Irreversible — la baja reversible es
 * `admin_suspender_usuario` (0040).
 *
 * El guard `es_admin` de las RPC no alcanza acá porque el borrado va por el cliente
 * service-role (`borrarUsuarioYArchivos`), que saltea RLS; se chequea a mano.
 */
export async function adminBorrarUsuario(idObjetivo: string): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.esAdmin) return { ok: false, error: "No autorizado." };
  if (idObjetivo === user.id) return { ok: false, error: "No podés borrarte a vos mismo." };

  const { data: objetivo } = await supabase
    .from("perfiles")
    .select("es_admin")
    .eq("id", idObjetivo)
    .maybeSingle();
  if (!objetivo) return { ok: false, error: "Ese usuario no existe." };
  if (objetivo.es_admin) return { ok: false, error: "No podés borrar a otro admin." };

  try {
    await borrarUsuarioYArchivos(idObjetivo);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo borrar." };
  }

  revalidatePath("/admin");
  return { ok: true };
}
