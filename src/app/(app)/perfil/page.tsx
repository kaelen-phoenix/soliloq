import { createClient } from "@/lib/supabase/server";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
import { ObrasPrevias } from "@/components/perfil/obras-previas";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();

  if (perfil?.rol === "talento") {
    const [{ data: perfilTalento }, { data: fotos }] = await Promise.all([
      supabase.from("perfiles_talento").select("*").eq("id", user.id).single(),
      supabase.from("fotos_talento").select("*").eq("talento_id", user.id).order("orden"),
    ]);

    const fotosConUrl = (fotos ?? []).map((f) => ({
      id: f.id,
      storage_path: f.storage_path,
      orden: f.orden,
      url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
      enBd: true,
    }));

    return (
      <main className="px-6 py-6">
        <FormularioTalento
          userId={user.id}
          esAlta={false}
          datosIniciales={perfilTalento ?? undefined}
          fotosIniciales={fotosConUrl}
        />
        <div className="mt-8">
          <CerrarSesionBoton />
        </div>
      </main>
    );
  }

  const [{ data: perfilCreador }, { data: obrasPrevias }] = await Promise.all([
    supabase.from("perfiles_creador").select("*").eq("id", user.id).single(),
    supabase.from("obras_previas").select("*").eq("creador_id", user.id),
  ]);

  return (
    <main className="px-6 py-6">
      <FormularioCreador userId={user.id} esAlta={false} datosIniciales={perfilCreador ?? undefined} />
      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Historial de obras previas</h2>
        <ObrasPrevias creadorId={user.id} obras={obrasPrevias ?? []} />
      </section>
      <div className="mt-8">
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
