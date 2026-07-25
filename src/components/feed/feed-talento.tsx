import { createClient } from "@/lib/supabase/server";
import { PilaTarjetas } from "./pila-tarjetas";

export async function FeedTalento({ talentoId }: { talentoId: string }) {
  const supabase = createClient();

  const { data: perfilTalento } = await supabase
    .from("perfiles_talento")
    .select("locacion")
    .eq("id", talentoId)
    .single();

  const { data: roles } = await supabase.rpc("feed_para_talento", { p_talento_id: talentoId });

  return (
    <PilaTarjetas
      talentoId={talentoId}
      locacionPropia={perfilTalento?.locacion ?? null}
      rolesIniciales={roles ?? []}
    />
  );
}
