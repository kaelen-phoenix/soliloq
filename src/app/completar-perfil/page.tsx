import Link from "next/link";
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
      <h1 className="text-xl font-bold text-ink-900">
        {perfil.rol === "talento" ? "Contanos sobre vos" : "Contanos sobre tu proyecto"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">
        Estás creando tu perfil como{" "}
        <strong>{perfil.rol === "talento" ? "Talento" : "Creador"}</strong>.{" "}
        <Link href="/elegir-rol" className="font-medium text-brand-600 underline">
          Me equivoqué de rol
        </Link>
      </p>
      {perfil.rol === "talento" ? (
        <FormularioTalento userId={user.id} esAlta fotosIniciales={[]} />
      ) : (
        <FormularioCreador userId={user.id} esAlta />
      )}
    </main>
  );
}
