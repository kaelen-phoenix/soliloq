import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";
import { PerfilCreadorDetalle } from "@/components/perfil/perfil-creador-detalle";

export default async function PerfilCreadorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: creador } = await supabase
    .from("perfiles_creador")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!creador) notFound();

  return (
    <main className="px-5 py-5">
      <PerfilCreadorDetalle creador={creador} />

      <div className="mt-8">
        <BotonDenuncia perfilDenunciadoId={creador.id} queSeDenuncia={`a ${creador.nombre}`} />
      </div>
    </main>
  );
}
