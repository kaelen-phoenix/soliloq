import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { rolFaltante } from "@/lib/cuenta";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export default async function NuevoPerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const estado = await leerEstadoCuenta(supabase, user.id);
  const falta = rolFaltante(estado);
  if (!falta) redirect("/perfil");

  return (
    <main className="px-6 py-6">
      <h1 className="text-xl font-bold text-ink-900">
        {falta === "talento" ? "Sumá tu perfil de Talento" : "Sumá tu perfil de Creador"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">
        {falta === "talento"
          ? "Vas a poder postularte a convocatorias sin perder tus obras."
          : "Vas a poder publicar convocatorias sin perder tu perfil de actuación."}{" "}
        <Link href="/" className="font-medium text-brand-600 underline">
          Ahora no
        </Link>
      </p>

      {falta === "talento" ? (
        <FormularioTalento userId={user.id} esAlta fotosIniciales={[]} />
      ) : (
        <FormularioCreador userId={user.id} esAlta />
      )}
    </main>
  );
}
