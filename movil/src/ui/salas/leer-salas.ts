import { nombresDeLosOtros, type SalaItem } from "@/lib/salas-reglas";
import { supabase } from "~/lib/supabase";

type Uno<T> = T | T[] | null | undefined;
const uno = <T,>(v: Uno<T>): T | null => (!v ? null : Array.isArray(v) ? (v[0] ?? null) : v);

/** Lo mismo que lee `/salas` en la web: los chats propios, con su último mensaje. */
export async function leerSalas(
  userId: string,
  textos: { sinCompletar: string; separador: string; proyecto: string },
): Promise<SalaItem[]> {
  const [{ data: integraciones }, { data: destacados }] = await Promise.all([
    supabase
      .from("sala_integrantes")
      .select("sala_id, salas(id, titulo, obra_id, equipo_id, obras(titulo, creador_id), equipos(titulo, creador_id))")
      .eq("perfil_id", userId),
    supabase.from("chats_destacados").select("sala_id, creado_en").eq("perfil_id", userId),
  ]);
  const destPorSala = new Map((destacados ?? []).map((d) => [d.sala_id, d.creado_en]));
  type Sala = {
    titulo: string | null;
    obra_id: string | null;
    equipo_id: string | null;
    obras: Uno<{ titulo: string; creador_id: string }>;
    equipos: Uno<{ titulo: string; creador_id: string }>;
  };
  const filas = (integraciones ?? []).map((i) => ({ salaId: i.sala_id, sala: uno(i.salas as Uno<Sala>) }));

  // Chats directos: el título es el nombre de la otra persona, leído ahora.
  const directas = filas.filter((f) => !f.sala?.obra_id && !f.sala?.equipo_id).map((f) => f.salaId);
  let nombres = new Map<string, string>();
  if (directas.length > 0) {
    const { data: integrantes } = await supabase
      .from("sala_integrantes")
      .select("sala_id, perfil_id")
      .in("sala_id", directas)
      .neq("perfil_id", userId);
    const ids = Array.from(new Set((integrantes ?? []).map((i) => i.perfil_id)));
    const { data: talentos } = ids.length
      ? await supabase.from("perfiles_talento").select("id, nombre").in("id", ids)
      : { data: [] as { id: string; nombre: string }[] };
    nombres = nombresDeLosOtros(directas, integrantes ?? [], talentos ?? [], {
      sinCompletar: textos.sinCompletar,
      separador: textos.separador,
    });
  }

  return Promise.all(
    filas.map(async ({ salaId, sala }) => {
      const { data: ultimo } = await supabase
        .from("mensajes")
        .select("contenido, creado_en")
        .eq("sala_id", salaId)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();
      // La obra/equipo queda en null si se bloqueó a su creador (0022).
      const obra = uno(sala?.obras);
      const equipo = uno(sala?.equipos);
      return {
        salaId,
        titulo: obra?.titulo ?? equipo?.titulo ?? nombres.get(salaId) ?? sala?.titulo ?? textos.proyecto,
        esEquipo: !!equipo,
        esDeIniciativa: !!(sala?.obra_id || sala?.equipo_id),
        ultimoMensaje: ultimo?.contenido ?? null,
        ultimaActividad: ultimo?.creado_en ?? null,
        destacadoEn: destPorSala.get(salaId) ?? null,
        esDueno: obra?.creador_id === userId || equipo?.creador_id === userId,
      };
    }),
  );
}
