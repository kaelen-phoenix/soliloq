import { createClient } from "@/lib/supabase/server";
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

  const [{ data: rolesRaw }, { data: equiposRaw }] = await Promise.all([
    supabase.rpc("feed_para_talento", { p_talento_id: talentoId, p_radio_metros: radio }),
    supabase.rpc("feed_equipos_para_talento"),
  ]);

  const publicUrl = (p: string) =>
    supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;

  // Las fotos de la obra vienen como rutas de Storage; se resuelven acá a URL pública.
  const roles: RolFeed[] = (rolesRaw ?? []).map((r) => ({
    ...r,
    fotos: (r.obra_fotos ?? []).map(publicUrl),
  }));

  const equipos: EquipoFeed[] = (equiposRaw ?? []).map((e) => ({
    equipo_id: e.equipo_id,
    titulo: e.titulo,
    cupo: e.cupo,
    creador_id: e.creador_id,
    creador_nombre: e.creador_nombre,
    creador_imagen_url: e.creador_imagen_url,
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
