import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GestionEquipo } from "@/components/convocatorias/gestion-equipo";
import type { FilaCobertura } from "@/components/convocatorias/cobertura-iniciativa";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

export async function generateMetadata() {
  const t = await getTranslations("titulos");
  return { title: `${t("equipo")} — Yalope` };
}

/**
 * La pantalla de un Equipo (#341), como la del Proyecto: editarlo, sus fotos, buscar talento,
 * quiénes están, cerrarlo o eliminarlo. Solo para quien lo armó.
 */
export default async function EquipoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, titulo, descripcion, cupo, activo, creador_id, fotos_equipo(id, storage_path, orden)")
    .eq("id", params.id)
    .maybeSingle();
  if (!equipo || equipo.creador_id !== user.id) notFound();

  const url = (p: string) => supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;
  const fotos = (equipo.fotos_equipo ?? [])
    .map((f) => ({ id: f.id, storage_path: f.storage_path, orden: f.orden, url: url(f.storage_path) }))
    .sort((a, b) => a.orden - b.orden);

  const { data: coberturaRaw, error } = await supabase.rpc("cobertura_iniciativa", {
    p_obra_id: null,
    p_equipo_id: equipo.id,
  });
  if (error) reportarErrorSupabase(error, { rpc: "cobertura_iniciativa", equipoId: equipo.id });
  const cobertura: FilaCobertura[] = (coberturaRaw ?? []).map((r) => ({
    rolId: r.rol_id,
    rolNombre: r.rol_nombre,
    vacantes: r.vacantes,
    convocatoriaId: r.convocatoria_id,
    talentoId: r.talento_id,
    talentoNombre: r.talento_nombre,
    talentoFotoUrl: r.talento_foto ? url(r.talento_foto) : null,
  }));

  return (
    <main className="px-5 py-5">
      <GestionEquipo creadorId={user.id} equipo={equipo} fotos={fotos} cobertura={cobertura} />
    </main>
  );
}
