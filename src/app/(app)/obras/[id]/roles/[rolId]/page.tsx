import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BandejaPostulantes, type PostulanteConTalento } from "@/components/seleccion/bandeja-postulantes";

export default async function RolPostulantesPage({ params }: { params: { id: string; rolId: string } }) {
  const supabase = createClient();

  const { data: rol } = await supabase
    .from("roles")
    .select("id, nombre, vacantes, obras(id, titulo, estado)")
    .eq("id", params.rolId)
    .single();

  if (!rol) notFound();

  const { data: postulaciones } = await supabase
    .from("postulaciones")
    .select(
      "id, estado, talento_id, perfiles_talento(id, nombre, fecha_nacimiento, ubicacion_publica, genero, genero_descripcion, videoreel_url, experiencia, habilidades)"
    )
    .eq("rol_id", params.rolId)
    .order("creado_en", { ascending: false });

  const talentoIds = (postulaciones ?? []).map((p: any) => p.talento_id);
  const { data: fotos } = talentoIds.length
    ? await supabase.from("fotos_talento").select("id, talento_id, storage_path, orden").in("talento_id", talentoIds)
    : { data: [] };

  const postulantes: PostulanteConTalento[] = (postulaciones ?? []).map((p: any) => ({
    postulacionId: p.id,
    estado: p.estado,
    talento: {
      ...p.perfiles_talento,
      fotos: (fotos ?? [])
        .filter((f) => f.talento_id === p.talento_id)
        .map((f) => ({
          id: f.id,
          orden: f.orden,
          url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
        })),
    },
  }));

  const obra = Array.isArray(rol.obras) ? rol.obras[0] : (rol.obras as any);

  return (
    <main className="px-5 py-5">
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-400">{obra.titulo}</p>
      <h2 className="mb-5 mt-1 text-xl font-semibold leading-tight text-ink-900">{rol.nombre}</h2>
      <BandejaPostulantes
        postulantesIniciales={postulantes}
        vacantes={rol.vacantes}
        obraCerrada={obra.estado === "cerrada"}
      />
    </main>
  );
}
