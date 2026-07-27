import { createClient } from "@/lib/supabase/server";
import { PilaTarjetas } from "./pila-tarjetas";

export async function FeedTalento({ talentoId }: { talentoId: string }) {
  const supabase = createClient();

  const { data: perfilTalento } = await supabase
    .from("perfiles_talento")
    .select("radio_busqueda_metros, unidad_distancia")
    .eq("id", talentoId)
    .single();

  // El radio viaja a Postgres: el filtro por distancia se resuelve en la query, no acá.
  const radio = perfilTalento?.radio_busqueda_metros ?? null;
  const { data: roles } = await supabase.rpc("feed_para_talento", {
    p_talento_id: talentoId,
    p_radio_metros: radio,
  });

  return (
    <PilaTarjetas
      talentoId={talentoId}
      radioInicialMetros={radio}
      unidadInicial={perfilTalento?.unidad_distancia ?? "km"}
      rolesIniciales={roles ?? []}
    />
  );
}
