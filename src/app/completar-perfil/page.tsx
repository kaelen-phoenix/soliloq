import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { FormularioCreador } from "@/components/perfil/formulario-creador";

export default async function CompletarPerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil?.rol) redirect("/elegir-rol");

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-10">
      <h1 className="mb-6 text-xl font-bold text-ink-900">
        {perfil.rol === "talento" ? "Contanos sobre vos" : "Contanos sobre tu proyecto"}
      </h1>
      {perfil.rol === "talento" ? (
        <FormularioTalento userId={user.id} esAlta fotosIniciales={[]} />
      ) : (
        <FormularioCreador userId={user.id} esAlta />
      )}
    </main>
  );
}
