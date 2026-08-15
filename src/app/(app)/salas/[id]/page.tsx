import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalaChat, type Integrante } from "@/components/salas/sala-chat";

export default async function SalaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sala } = await supabase.from("salas").select("id, obra_id, titulo, obras(titulo, creador_id)").eq("id", params.id).single();
  if (!sala) notFound();

  // La obra puede venir vacía aunque la sala exista: si quien mira bloqueó al creador, la
  // política restrictiva de 0022 esconde la fila de `obras` y el join queda en null. La sala
  // sigue siendo suya y sigue teniendo al resto del elenco, así que se muestra igual.
  const obra = (Array.isArray(sala.obras) ? sala.obras[0] : sala.obras) as
    | { titulo: string; creador_id: string }
    | null
    | undefined;

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
    obra
      ? supabase.from("perfiles_creador").select("id, nombre, imagen_url").eq("id", obra.creador_id).maybeSingle()
      : Promise.resolve({ data: null }),
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
      // Sin obra no hay rol que mostrar: la sala nació de un interés mutuo, no de un casting.
      rol_en_obra: rolNombre ?? (sala.obra_id ? "Elenco" : "Armando equipo"),
    };
  });

  return (
    // Alto fijo = pantalla menos el Encabezado sticky (safe-area + su contenido, ~5.25rem) y
    // menos el espacio que AppLayout reserva para BarraNavegacion (pb-20 = 5rem). Con esto la
    // barra de título y el chat se reparten ese alto vía flex, en lugar de que SalaChat adivine
    // por su cuenta cuánto mide la barra de título: así el input queda anclado al fondo real de
    // la pantalla sin importar cuántos mensajes haya, y sólo la lista de mensajes scrollea.
    <div
      className="flex flex-col"
      style={{ height: "calc(100dvh - env(safe-area-inset-top) - 5.25rem - 5rem)" }}
    >
      <div className="border-b border-ink-100 px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {sala.obra_id ? "Sala de proyecto" : "Armar equipo"}
        </p>
        {/* Tres títulos posibles: el de la obra, el de una sala sin obra, o el genérico
            cuando la fila de `obras` está escondida por bloqueo (0022). */}
        <h1 className="font-display font-semibold tracking-[-0.02em] text-ink-900">
          {obra?.titulo ?? sala.titulo ?? "Proyecto"}
        </h1>
      </div>
      <SalaChat salaId={params.id} userId={user.id} mensajesIniciales={mensajes ?? []} integrantes={integrantes} />
    </div>
  );
}
