import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";

export default async function PerfilTalentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: talento }, { data: fotos }] = await Promise.all([
    supabase.from("perfiles_talento").select("*").eq("id", params.id).single(),
    supabase.from("fotos_talento").select("*").eq("talento_id", params.id).order("orden"),
  ]);

  if (!talento) notFound();

  const fotosConUrl = (fotos ?? []).map((f) => ({
    id: f.id,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
  }));

  return (
    <main className="px-6 py-6">
      <PerfilTalentoDetalle talento={{ ...talento, fotos: fotosConUrl }} />
    </main>
  );
}
