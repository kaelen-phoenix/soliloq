import Link from "next/link";
import { redirect } from "next/navigation";
import { AltaTalento } from "@/components/perfil/alta-talento";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
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
    <main className="px-5 py-5">
      <h2 className="text-xl font-semibold leading-tight text-texto">
        {falta === "talento" ? "Sumá tu perfil de Talento" : "Sumá tu perfil de Creador"}
      </h2>
      <p className="mb-6 mt-1.5 text-sm leading-relaxed text-texto-tenue">
        {falta === "talento"
          ? "Vas a poder postularte a convocatorias sin perder tus obras."
          : "Vas a poder publicar convocatorias sin perder tu perfil de actuación."}{" "}
        <Link href="/" className="font-medium text-texto underline decoration-ink-300 underline-offset-2">
          Ahora no
        </Link>
      </p>

      {falta === "talento" ? (
        <AltaTalento userId={user.id} />
      ) : (
        <FormularioCreador userId={user.id} esAlta />
      )}
    </main>
  );
}
