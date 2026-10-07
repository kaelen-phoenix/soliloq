import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocatoriasLista } from "@/components/talento/convocatorias-lista";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

export async function generateMetadata() {
  const t = await getTranslations("proyectos.convocatoria");
  return { title: `${t("metaTitulo")} — Yalope` };
}

export default async function ConvocatoriaPage() {
  const supabase = createClient();
  const t = await getTranslations("proyectos.convocatoria");
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const { data, error } = await supabase.rpc("mis_convocatorias");
  if (error) reportarErrorSupabase(error, { rpc: "mis_convocatorias", userId: user.id });

  const url = (p: string | null) =>
    p ? supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl : null;

  const filas = (data ?? []).map((c) => ({
    convocatoriaId: c.convocatoria_id,
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    creadorNombre: c.creador_nombre,
    talentoFotoUrl: url(c.talento_foto),
    iniciativaFotoUrl: url(c.iniciativa_foto),
  }));

  return (
    <main className="px-5 py-5">
      <p className="mb-5 text-sm text-texto-tenue">
        {t("bajada")}
      </p>

      {filas.length === 0 ? (
        <EstadoVacio
          icono="corazon"
          titulo={t("vacioTitulo")}
          detalle={t("vacioDetalle")}
        />
      ) : (
        <ConvocatoriasLista filas={filas} />
      )}
    </main>
  );
}
