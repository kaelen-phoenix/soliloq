import { createClient } from "@/lib/supabase/server";
import { aRolFeed } from "@/lib/feed-roles";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { PilaTarjetas } from "./pila-tarjetas";
import type { RolFeed } from "./tarjeta-rol";
import type { EquipoFeed } from "./tarjeta-equipo";

export async function FeedTalento({ talentoId }: { talentoId: string }) {
  const supabase = createClient();

  const { data: perfilTalento } = await supabase
    .from("perfiles_talento")
    .select("radio_busqueda_metros, unidad_distancia, onboarding_visto_en")
    .eq("id", talentoId)
    .single();

  // El radio viaja a Postgres: el filtro por distancia se resuelve en la query, no acá.
  const radio = perfilTalento?.radio_busqueda_metros ?? null;

  const [
    { data: rolesRaw, error: errorRoles },
    { data: equiposRaw, error: errorEquipos },
  ] = await Promise.all([
    supabase.rpc("feed_para_talento", { p_talento_id: talentoId, p_radio_metros: radio }),
    supabase.rpc("feed_equipos_para_talento"),
  ]);
  if (errorRoles) reportarErrorSupabase(errorRoles, { rpc: "feed_para_talento", talentoId });
  if (errorEquipos) reportarErrorSupabase(errorEquipos, { rpc: "feed_equipos_para_talento", talentoId });

  const publicUrl = (p: string) =>
    supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;

  // La foto del creador sale de su Perfil de Talento (0072).
  const roles: RolFeed[] = (rolesRaw ?? []).map((r) => aRolFeed(r, publicUrl));

  const equipos: EquipoFeed[] = (equiposRaw ?? []).map((e) => ({
    equipo_id: e.equipo_id,
    titulo: e.titulo,
    cupo: e.cupo,
    creador_id: e.creador_id,
    creador_nombre: e.creador_nombre,
    creador_imagen_url: e.creador_foto_path ? publicUrl(e.creador_foto_path) : null,
    fotos: (e.fotos ?? []).map(publicUrl),
  }));

  return (
    <PilaTarjetas
      talentoId={talentoId}
      radioInicialMetros={radio}
      unidadInicial={perfilTalento?.unidad_distancia ?? "km"}
      rolesIniciales={roles ?? []}
      equiposIniciales={equipos}
      // `null` es "todavía no lo vio", que es el estado de las cuentas que ya existían
      // antes de esta columna: el ejemplo lo ve todo el mundo una vez, no sólo quien se
      // registre de ahora en más.
      mostrarEjemplos={!perfilTalento?.onboarding_visto_en}
    />
  );
}
