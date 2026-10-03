import { createClient } from "@/lib/supabase/server";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocadosLista } from "@/components/convocatorias/convocados-lista";
import { ModalNuevoMatch } from "@/components/convocatorias/modal-nuevo-match";
import { MisMatchesTalento, type FilaMatchTalento } from "@/components/convocatorias/mis-matches-talento";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

export const metadata = { title: "Matches — Yalope" };

export default async function MatchesPage() {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);

  const [
    { data: matches, error: errorMatches },
    { data: convocados, error: errorConvocados },
    { data: cobertura, error: errorCobertura },
    { data: comoTalento, error: errorComoTalento },
  ] = await Promise.all([
    supabase.rpc("mis_matches"),
    supabase.rpc("mis_convocados"),
    // Roles del Proyecto activo, para elegir a cuál queda asociado al convocar en firme
    // (#152). Un Equipo no tiene roles: no hace falta elegir nada.
    iniciativa?.tipo === "obra"
      ? supabase.rpc("cobertura_iniciativa", { p_obra_id: iniciativa.id, p_equipo_id: null })
      : Promise.resolve({ data: null, error: null }),
    // #298: del otro lado, dónde hizo match quien mira (todos, no solo quien tiene proyecto).
    supabase.rpc("mis_matches_como_talento"),
  ]);
  if (errorComoTalento)
    reportarErrorSupabase(errorComoTalento, { rpc: "mis_matches_como_talento", userId: user.id });
  if (errorMatches) reportarErrorSupabase(errorMatches, { rpc: "mis_matches", userId: user.id });
  if (errorConvocados)
    reportarErrorSupabase(errorConvocados, { rpc: "mis_convocados", userId: user.id });
  if (errorCobertura)
    reportarErrorSupabase(errorCobertura, { rpc: "cobertura_iniciativa", userId: user.id });

  const url = (path: string | null) =>
    path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;

  // Un rol ya cubierto (todas sus vacantes con convocatoria pendiente o aceptada) no se
  // puede elegir de nuevo al convocar.
  const roles = cobertura
    ? [...new Map(cobertura.filter((r) => r.rol_id).map((r) => [r.rol_id, r])).values()].map((r) => ({
        id: r.rol_id as string,
        nombre: r.rol_nombre as string,
        disponible:
          cobertura.filter((x) => x.rol_id === r.rol_id && x.talento_id).length < r.vacantes,
      }))
    : null;

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
  }));

  const filasTalento: FilaMatchTalento[] = (comoTalento ?? []).map((m) => ({
    matchId: m.match_id,
    esEquipo: m.es_equipo,
    obraId: m.obra_id,
    titulo: m.iniciativa_titulo,
    fotoUrl: url(m.iniciativa_foto),
    creadorNombre: m.creador_nombre,
    expiraEn: m.expira_en,
    estado: m.estado,
    salaId: m.sala_id,
  }));
  const filasCreador = [...filasMatches, ...filasConvocados];

  return (
    <main className="flex flex-col gap-7 px-5 py-5">
      <p className="text-sm text-texto-tenue">
        Interés mutuo: cuando a vos y a la otra parte les interesa, aparece acá.
      </p>

      {filasCreador.length === 0 && filasTalento.length === 0 && (
        <EstadoVacio
          icono="corazon"
          titulo="Todavía no hay matches"
          detalle="Marcá «Me interesa» en Explorar, o buscá talento para tu proyecto. Cuando el interés es mutuo, aparece acá."
        />
      )}
      {filasCreador.length > 0 && <ConvocadosLista filas={filasCreador} roles={roles} />}
      {filasTalento.length > 0 && <MisMatchesTalento filas={filasTalento} />}

      <ModalNuevoMatch nuevos={nuevos} />
    </main>
  );
}
