import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ListaSalas } from "@/components/salas/lista-salas";
import { InvitacionComunidad } from "@/components/comunidad/invitacion-comunidad";
import { createClient } from "@/lib/supabase/server";
import { usuarioDeLaRequest, estadoCuentaDeLaRequest } from "@/lib/sesion-servidor";

/** Por cada chat directo, el nombre de quienes no son uno («Perfil sin completar» si no tienen). */
async function nombresDeLosOtros(
  supabase: ReturnType<typeof createClient>,
  salaIds: string[],
  yo: string,
): Promise<Map<string, string>> {
  const nombres = new Map<string, string>();
  if (salaIds.length === 0) return nombres;
  const { data: integrantes } = await supabase
    .from("sala_integrantes")
    .select("sala_id, perfil_id")
    .in("sala_id", salaIds)
    .neq("perfil_id", yo);
  const ids = Array.from(new Set((integrantes ?? []).map((i) => i.perfil_id)));
  const { data: talentos } = ids.length
    ? await supabase.from("perfiles_talento").select("id, nombre").in("id", ids)
    : { data: [] as { id: string; nombre: string }[] };
  const nombre = new Map((talentos ?? []).map((t) => [t.id, t.nombre]));
  for (const salaId of salaIds) {
    const otros = (integrantes ?? []).filter((i) => i.sala_id === salaId).map((i) => nombre.get(i.perfil_id) ?? "Perfil sin completar");
    if (otros.length) nombres.set(salaId, otros.join(" y "));
  }
  return nombres;
}

export default async function SalasPage() {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const estado = await estadoCuentaDeLaRequest(user.id);

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

  // Chats directos (sin Proyecto ni Equipo): el título es el nombre de la otra persona, leído
  // ahora y no el «A y B» que quedó guardado al crearse (si alguien todavía no tenía perfil,
  // quedaba «Alguien» para siempre).
  const directas = (integraciones ?? [])
    .filter((i: any) => !i.salas?.obra_id && !i.salas?.equipo_id)
    .map((i: any) => i.sala_id as string);
  const nombresDirectos = await nombresDeLosOtros(supabase, directas, user.id);

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
        titulo: obra?.titulo ?? equipo?.titulo ?? nombresDirectos.get(i.sala_id) ?? i.salas?.titulo ?? "Proyecto",
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
      <InvitacionComunidad variante="compacta" />
      {salasVisibles.length === 0 ? (
        <EstadoVacio
          icono="salas"
          titulo="Todavía no tenés chats"
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
