import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import { COLUMNAS_PUBLICAS_TALENTO } from "@/lib/constantes";
import { redesDeJson } from "@/lib/redes";

export default async function PerfilTalentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const t = await getTranslations("proyectos.talentos");

  // Solo lo público: la fecha y la ubicación exacta no salen de la base (#255).
  const [{ data: talento }, { data: fotos }, { data: edad }] = await Promise.all([
    supabase.from("perfiles_talento").select(COLUMNAS_PUBLICAS_TALENTO).eq("id", params.id).single(),
    supabase.from("fotos_talento").select("*").eq("talento_id", params.id).order("orden"),
    supabase.rpc("edad_publica", { p_perfil: params.id }),
  ]);

  if (!talento) notFound();

  const fotosConUrl = (fotos ?? []).map((f) => ({
    id: f.id,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
  }));

  return (
    <main className="px-5 py-5">
      {/* Solo visualización: el interés se marca desde la pila de `/talentos` (#124). */}
      <PerfilTalentoDetalle talento={{ ...talento, redes: redesDeJson(talento.redes), edad: edad ?? null, fotos: fotosConUrl }} />

      <div className="mt-8">
        <BotonDenuncia perfilDenunciadoId={talento.id} queSeDenuncia={t("denunciarA", { nombre: talento.nombre })} />
      </div>
    </main>
  );
}
