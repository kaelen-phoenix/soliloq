import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sincronizarEspacio } from "@/lib/discord-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { claveErrorDesvincular } from "@/lib/salas-reglas";
import type { Database } from "@/lib/supabase/types";

/**
 * Lo de los chats que necesita el servidor, con la sesión ya resuelta: lo usan las acciones de
 * la web (`salas/acciones.ts`) y el endpoint de la app nativa (`/api/app/salas`, #394).
 */
type Sesion = { supabase: SupabaseClient<Database>; user: User };

/**
 * Desvincularse de un chat (salir del proyecto/equipo). El dueño no puede. Después de salir,
 * se pone al día el espacio de Discord de la sala (#269): pierde el acceso. `error` es la clave
 * de `chats.acciones`.
 */
export async function desvincularmeDe(
  { supabase, user }: Sesion,
  salaId: string,
): Promise<{ ok: true } | { ok: false; error: "errorDueno" | "errorGenerico" }> {
  const { error } = await supabase.rpc("desvincularme_de_sala", { p_sala_id: salaId });
  if (error) {
    const clave = claveErrorDesvincular(error.message);
    if (clave === "errorGenerico") {
      reportarErrorSupabase(error, { rpc: "desvincularme_de_sala", salaId, userId: user.id });
    }
    return { ok: false, error: clave };
  }
  await sincronizarEspacio(salaId).catch(() => {});
  return { ok: true };
}
