import { createClient } from "@/lib/supabase/server";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocadosLista } from "@/components/convocatorias/convocados-lista";
import { ModalNuevoMatch } from "@/components/convocatorias/modal-nuevo-match";
import { MisMatchesTalento, type FilaMatchTalento } from "@/components/convocatorias/mis-matches-talento";
import { PestanasMatches } from "@/components/convocatorias/pestanas-matches";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

export const metadata = { title: "Convocatorias — Yalope" };

export default async function MatchesPage() {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);

  const [
    { data: matches, error: errorMatches },
    { data: convocados, error: errorConvocados },
    { data: comoTalento, error: errorComoTalento },
  ] = await Promise.all([
    supabase.rpc("mis_matches"),
    supabase.rpc("mis_convocados"),
    // #298: del otro lado, dónde hizo match quien mira (todos, no solo quien tiene proyecto).
    supabase.rpc("mis_matches_como_talento"),
  ]);
  if (errorComoTalento)
    reportarErrorSupabase(errorComoTalento, { rpc: "mis_matches_como_talento", userId: user.id });
  if (errorMatches) reportarErrorSupabase(errorMatches, { rpc: "mis_matches", userId: user.id });
  if (errorConvocados)
    reportarErrorSupabase(errorConvocados, { rpc: "mis_convocados", userId: user.id });

  // Roles de cada Proyecto con matches, para elegir a cuál queda asociado al convocar (#152).
  // Con varios Proyectos a la vez (#330), cada match ofrece los roles del suyo. Un Equipo no
  // tiene roles: no hace falta elegir nada. Un rol ya cubierto no se puede elegir de nuevo.
  const obraIds = Array.from(
    new Set([...(matches ?? []), ...(convocados ?? [])].map((m) => m.obra_id).filter((x): x is string => !!x)),
  );
  const rolesPorObra: Record<string, { id: string; nombre: string; disponible: boolean }[]> = {};
  await Promise.all(
    obraIds.map(async (obraId) => {
      const { data: cobertura, error } = await supabase.rpc("cobertura_iniciativa", {
        p_obra_id: obraId,
        p_equipo_id: null,
      });
      if (error) reportarErrorSupabase(error, { rpc: "cobertura_iniciativa", obraId });
      rolesPorObra[obraId] = [...new Map((cobertura ?? []).filter((r) => r.rol_id).map((r) => [r.rol_id, r])).values()].map(
        (r) => ({
          id: r.rol_id as string,
          nombre: r.rol_nombre as string,
          disponible: (cobertura ?? []).filter((x) => x.rol_id === r.rol_id && x.talento_id).length < r.vacantes,
        }),
      );
    }),
  );

  const url = (path: string | null) =>
    path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;


  const filas = (matches ?? []).map((m) => ({
    matchId: m.match_id,
    talentoId: m.talento_id,
    nombre: m.nombre,
    fotoUrl: url(m.foto_path),
    expiraEn: m.expira_en,
    esEquipo: m.es_equipo,
    iniciativaTitulo: m.iniciativa_titulo,
    iniciativaFotoUrl: url(m.iniciativa_foto),
    cupoLleno: m.cupo_lleno,
    obraId: m.obra_id,
  }));

  // Aviso de "¡Tenés un Match!" (#194): uno por match, la primera vez que este Creador
  // entra a Matches después de que se generó.
  const nuevos = (matches ?? [])
    .filter((m) => !m.mostrado_en)
    .map((m) => ({
      matchId: m.match_id,
      nombre: m.nombre,
      fotoUrl: url(m.foto_path),
      esEquipo: m.es_equipo,
      iniciativaTitulo: m.iniciativa_titulo,
      iniciativaFotoUrl: url(m.iniciativa_foto),
    }));

  // #287: un match nuevo se convoca directo, en la misma lista (antes había que aceptarlo
  // primero para que pasara a Convocados).
  const filasMatches = filas.map((f) => ({
    matchId: f.matchId,
    convocatoriaId: null,
    talentoId: f.talentoId,
    nombre: f.nombre,
    fotoUrl: f.fotoUrl,
    esEquipo: f.esEquipo,
    iniciativaTitulo: f.iniciativaTitulo,
    estado: "en_convocados" as const,
    expiraEn: f.expiraEn,
    cupoLleno: f.cupoLleno,
    obraId: f.obraId,
  }));

  const filasConvocados = (convocados ?? []).map((c) => ({
    matchId: c.match_id,
    convocatoriaId: c.convocatoria_id,
    talentoId: c.talento_id,
    nombre: c.nombre,
    fotoUrl: url(c.foto_path),
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    estado: c.estado as "en_convocados" | "esperando_confirmacion" | "en_sala",
    obraId: c.obra_id,
  }));

  const filasTalento: FilaMatchTalento[] = (comoTalento ?? []).map((m) => ({
    matchId: m.match_id,
    esEquipo: m.es_equipo,
    obraId: m.obra_id,
    titulo: m.iniciativa_titulo,
    fotoUrl: url(m.iniciativa_foto),
    creadorNombre: m.creador_nombre,
    expiraEn: m.expira_en,
    estado: m.estado as FilaMatchTalento["estado"],
    salaId: m.sala_id,
  }));
  const filasCreador = [...filasMatches, ...filasConvocados];

  // #304: arranca en la pestaña que tiene algo; si ninguna, en la de proyectos solo si tiene
  // uno abierto (la fila de Creador queda aunque haya borrado todos).
  const tienePerfilCreador = iniciativa != null;
  const inicial =
    filasCreador.length > 0
      ? "proyectos"
      : filasTalento.length > 0 || !tienePerfilCreador
        ? "talento"
        : "proyectos";

  return (
    <main className="px-5 py-5">
      <p className="mb-5 text-sm text-texto-tenue">
        Cuando el interés es mutuo, aparece acá: para convocar, o porque te pueden convocar.
      </p>

      <PestanasMatches
        inicial={inicial}
        cantidadProyectos={filasCreador.length}
        cantidadTalento={filasTalento.length}
        panelProyectos={
          filasCreador.length > 0 ? (
            <ConvocadosLista filas={filasCreador} rolesPorObra={rolesPorObra} />
          ) : (
            <EstadoVacio
              icono="corazon"
              titulo="Todavía nadie para convocar"
              detalle={
                tienePerfilCreador
                  ? "Buscá talento desde tu proyecto o equipo. Cuando alguien que te interesa también lo marca, aparece acá para convocarlo."
                  : "Cuando armes un proyecto o equipo y busques talento, acá vas a ver a quién convocar."
              }
            />
          )
        }
        panelTalento={
          filasTalento.length > 0 ? (
            <MisMatchesTalento filas={filasTalento} />
          ) : (
            <EstadoVacio
              icono="corazon"
              titulo="Todavía no tenés convocatorias"
              detalle="Marcá «Me interesa» en Explorar. Si del otro lado también les interesa tu perfil, aparece acá."
            />
          )
        }
      />

      <ModalNuevoMatch nuevos={nuevos} />
    </main>
  );
}
