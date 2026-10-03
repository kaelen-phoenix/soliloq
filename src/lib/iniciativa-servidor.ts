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

/**
 * La iniciativa para la que se busca talento (#294): la que viene en la URL
 * (`/talentos?obra=…` o `?equipo=…`, desde la pantalla del Proyecto o el panel del Equipo)
 * si es de este Creador y sigue abierta; si no viene ninguna, la activa.
 */
export async function iniciativaParaBuscar(
  supabase: SupabaseClient<Database>,
  creadorId: string,
  pedida: { obra?: string | null; equipo?: string | null },
): Promise<IniciativaActiva | null> {
  if (pedida.equipo) {
    const { data } = await supabase
      .from("equipos")
      .select("id, titulo")
      .eq("id", pedida.equipo)
      .eq("creador_id", creadorId)
      .eq("activo", true)
      .maybeSingle();
    return data ? { tipo: "equipo", id: data.id, titulo: data.titulo } : null;
  }
  if (pedida.obra) {
    const { data } = await supabase
      .from("obras")
      .select("id, titulo")
      .eq("id", pedida.obra)
      .eq("creador_id", creadorId)
      .neq("estado", "cerrada")
      .maybeSingle();
    return data ? { tipo: "obra", id: data.id, titulo: data.titulo } : null;
  }
  return iniciativaActivaDelCreador(supabase, creadorId);
}
