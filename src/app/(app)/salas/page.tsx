import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ListaSalas } from "@/components/salas/lista-salas";
import { createClient } from "@/lib/supabase/server";

export default async function SalasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: integraciones }, { data: destacados }] = await Promise.all([
    supabase
      .from("sala_integrantes")
      .select(
        "sala_id, salas(id, titulo, obras(titulo, creador_id), equipos(titulo, creador_id))",
      )
      .eq("perfil_id", user.id),
    supabase.from("chats_destacados").select("sala_id, creado_en").eq("perfil_id", user.id),
  ]);

  const destPorSala = new Map((destacados ?? []).map((d) => [d.sala_id, d.creado_en]));

  const salas = await Promise.all(
    (integraciones ?? []).map(async (i: any) => {
      const { data: ultimoMensaje } = await supabase
        .from("mensajes")
        .select("contenido, creado_en")
        .eq("sala_id", i.sala_id)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      // La obra/equipo queda en null si se bloqueó a su creador (política restrictiva de
      // 0022): entonces presta el título la sala, o queda "Proyecto".
      const obra = i.salas?.obras;
      const equipo = i.salas?.equipos;

      return {
        salaId: i.sala_id as string,
        titulo: obra?.titulo ?? equipo?.titulo ?? i.salas?.titulo ?? "Proyecto",
        esEquipo: !!equipo,
        ultimoMensaje: ultimoMensaje?.contenido ?? null,
        ultimaActividad: (ultimoMensaje?.creado_en as string | undefined) ?? null,
        destacadoEn: destPorSala.get(i.sala_id) ?? null,
        esDueno: obra?.creador_id === user.id || equipo?.creador_id === user.id,
      };
    }),
  );

  return (
    <main className="px-5 py-5">
      {salas.length === 0 ? (
        <EstadoVacio
          icono="salas"
          titulo="Todavía no tenés salas"
          detalle="Se abren solas cuando se arma un equipo: ahí vas a hablar con el resto del proyecto."
        />
      ) : (
        <ListaSalas salas={salas} />
      )}
    </main>
  );
}
