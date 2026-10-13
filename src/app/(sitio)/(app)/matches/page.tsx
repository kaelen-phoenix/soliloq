import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocadosLista } from "@/components/convocatorias/convocados-lista";
import { ModalNuevoMatch } from "@/components/convocatorias/modal-nuevo-match";
import { MisMatchesTalento } from "@/components/convocatorias/mis-matches-talento";
import { PestanasMatches } from "@/components/convocatorias/pestanas-matches";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";
import { armarConvocatorias, obrasConMatches, pestanaInicial, rolesDeCobertura, type RolDisponible } from "@/lib/matches";

export async function generateMetadata() {
  const t = await getTranslations("titulos");
  return { title: `${t("matches")} — Yalope` };
}

export default async function MatchesPage() {
  const supabase = createClient();
  const t = await getTranslations("proyectos.matches");
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  // #368: el texto inicial de «Mis convocados» depende de si existe algún Proyecto o
  // Equipo propio, en cualquier estado (borrarlos todos lo vuelve a mostrar).
  const [iniciativa, obras, equipos] = await Promise.all([
    iniciativaActivaDelCreador(supabase, user.id),
    supabase.from("obras").select("id", { count: "exact", head: true }).eq("creador_id", user.id),
    supabase.from("equipos").select("id", { count: "exact", head: true }).eq("creador_id", user.id),
  ]);
  if (obras.error) reportarErrorSupabase(obras.error, { consulta: "contar obras propias" });
  if (equipos.error) reportarErrorSupabase(equipos.error, { consulta: "contar equipos propios" });
  // El texto inicial afirma «no tenés ninguno»: solo se muestra si los dos conteos lo
  // confirman. Si alguno falla, no se sabe, y se muestra el estado vacío común.
  const conteoFallido = !!obras.error || !!equipos.error;
  const tieneIniciativas = conteoFallido || (obras.count ?? 0) + (equipos.count ?? 0) > 0;

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
  const rolesPorObra: Record<string, RolDisponible[]> = {};
  await Promise.all(
    obrasConMatches(matches, convocados).map(async (obraId) => {
      const { data: cobertura, error } = await supabase.rpc("cobertura_iniciativa", {
        p_obra_id: obraId,
        p_equipo_id: null,
      });
      if (error) reportarErrorSupabase(error, { rpc: "cobertura_iniciativa", obraId });
      rolesPorObra[obraId] = rolesDeCobertura(cobertura);
    }),
  );

  const url = (path: string | null) =>
    path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;


  // Las filas de las dos pestañas y los avisos «Hay interés» (#194, #287, #298): las arma
  // `@/lib/matches`, igual que la app nativa.
  const { filasCreador, filasTalento, nuevos } = armarConvocatorias(matches, convocados, comoTalento, url);

  // #304: arranca en la pestaña que tiene algo.
  const inicial = pestanaInicial(filasCreador.length, filasTalento.length, iniciativa != null);

  return (
    <main className="px-5 py-5">
      <p className="mb-5 text-sm text-texto-tenue">
        {t("bajada")}
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
              titulo={t("vacioProyectosTitulo")}
              detalle={
                tieneIniciativas
                  ? t("vacioProyectosConIniciativa")
                  : t("vacioProyectosSinIniciativa")
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
              titulo={t("vacioTalentoTitulo")}
              detalle={t("vacioTalentoDetalle")}
            />
          )
        }
      />

      <ModalNuevoMatch nuevos={nuevos} />
    </main>
  );
}
