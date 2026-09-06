import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export interface IniciativaActiva {
  tipo: "obra" | "equipo";
  id: string;
  titulo: string;
}

/**
 * La iniciativa que el Creador está llevando adelante ahora (issues #105/#107): el equipo
 * activo, o si no, su obra más reciente que no esté cerrada. `null` si no tiene ninguna —
 * ahí no puede marcar interés en talentos todavía.
 */
export async function iniciativaActivaDelCreador(
  supabase: SupabaseClient<Database>,
  creadorId: string,
): Promise<IniciativaActiva | null> {
  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, titulo")
    .eq("creador_id", creadorId)
    .eq("activo", true)
    .maybeSingle();
  if (equipo) return { tipo: "equipo", id: equipo.id, titulo: equipo.titulo };

  const { data: obra } = await supabase
    .from("obras")
    .select("id, titulo")
    .eq("creador_id", creadorId)
    .neq("estado", "cerrada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (obra) return { tipo: "obra", id: obra.id, titulo: obra.titulo };

  return null;
}
