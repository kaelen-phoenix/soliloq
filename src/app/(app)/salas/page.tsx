import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ListaSalas } from "@/components/salas/lista-salas";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export default async function SalasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const estado = await leerEstadoCuenta(supabase, user.id);

  const [{ data: integraciones }, { data: destacados }] = await Promise.all([
    supabase
      .from("sala_integrantes")
      .select(
        "sala_id, salas(id, titulo, obra_id, equipo_id, obras(titulo, creador_id), equipos(titulo, creador_id))",
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
        // ¿La sala cuelga de un Proyecto/Equipo (tiene dueño) o es una sala 1:1 de armar
        // equipo entre personas (sin obra ni equipo)?
        esDeIniciativa: !!(i.salas?.obra_id || i.salas?.equipo_id),
        ultimoMensaje: ultimoMensaje?.contenido ?? null,
        ultimaActividad: (ultimoMensaje?.creado_en as string | undefined) ?? null,
        destacadoEn: destPorSala.get(i.sala_id) ?? null,
        esDueno: obra?.creador_id === user.id || equipo?.creador_id === user.id,
      };
    }),
  );

  // #144: la sala de un Proyecto/Equipo propio vive en la experiencia de Creador; las salas
  // donde participás como Talento, en la de Talento. Las salas 1:1 (sin iniciativa) van en
  // ambos modos. `modoActivo` ya viene resuelto contra los perfiles que existen.
  const modo = estado.modoActivo;
  const salasVisibles = salas.filter((s) =>
    !s.esDeIniciativa ? true : modo === "creador" ? s.esDueno : !s.esDueno,
  );

  return (
    <main className="px-5 py-5">
      {salasVisibles.length === 0 ? (
        <EstadoVacio
          icono="salas"
          titulo="Todavía no tenés salas"
          detalle={
            modo === "creador"
              ? "Se abren cuando convocás a alguien a tu proyecto o equipo."
              : "Se abren cuando te convocan a un proyecto o equipo."
          }
        />
      ) : (
        <ListaSalas salas={salasVisibles} />
      )}
    </main>
  );
}
