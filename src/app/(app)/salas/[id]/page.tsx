import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalaChat, type Integrante } from "@/components/salas/sala-chat";

export default async function SalaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sala } = await supabase.from("salas").select("id, obra_id, obras(titulo, creador_id)").eq("id", params.id).single();
  if (!sala) notFound();

  const obra = Array.isArray(sala.obras) ? sala.obras[0] : (sala.obras as any);

  const [{ data: mensajes }, { data: integrantesRaw }, { data: postulacionesAprobadas }] = await Promise.all([
    supabase.from("mensajes").select("*").eq("sala_id", params.id).order("creado_en"),
    supabase.from("sala_integrantes").select("perfil_id").eq("sala_id", params.id),
    supabase
      .from("postulaciones")
      .select("talento_id, roles(nombre, obra_id)")
      .eq("estado", "aprobado"),
  ]);

  const integrantesIds = (integrantesRaw ?? []).map((i) => i.perfil_id);

  const [{ data: talentos }, { data: creador }] = await Promise.all([
    supabase
      .from("perfiles_talento")
      .select("id, nombre, fotos_talento(storage_path, orden)")
      .in("id", integrantesIds),
    supabase.from("perfiles_creador").select("id, nombre, imagen_url").eq("id", obra.creador_id).maybeSingle(),
  ]);

  const integrantes: Integrante[] = integrantesIds.map((id) => {
    if (creador && id === creador.id) {
      return { perfil_id: id, nombre: creador.nombre, foto_url: creador.imagen_url, rol_en_obra: "Director/a" };
    }
    const talento = talentos?.find((t) => t.id === id);
    const rolNombre = (postulacionesAprobadas ?? []).find(
      (p: any) => p.talento_id === id && p.roles.obra_id === sala.obra_id
    )?.roles?.nombre;
    const fotoPrincipal = talento?.fotos_talento?.find((f: any) => f.orden === 0);
    return {
      perfil_id: id,
      nombre: talento?.nombre ?? "Integrante",
      foto_url: fotoPrincipal ? supabase.storage.from("fotos-perfil").getPublicUrl(fotoPrincipal.storage_path).data.publicUrl : null,
      rol_en_obra: rolNombre ?? "Elenco",
    };
  });

  return (
    <div>
      <div className="border-b border-ink-100 px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Sala de proyecto</p>
        <h1 className="font-semibold text-ink-900">{obra.titulo}</h1>
      </div>
      <SalaChat salaId={params.id} userId={user.id} mensajesIniciales={mensajes ?? []} integrantes={integrantes} />
    </div>
  );
}
