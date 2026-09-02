import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { FormularioCreador } from "@/components/perfil/formulario-creador";

export default async function CompletarPerfilPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil?.rol) redirect("/elegir-rol");

  // Solo destinos internos: sin esto, `next` sería un redirect abierto.
  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : undefined;

  return (
    <main className="min-h-screen px-6 py-10 sm:bg-ink-50 sm:py-14">
      <div className="mx-auto max-w-lg sm:rounded-2xl sm:border sm:border-ink-100 sm:bg-white sm:p-8 sm:shadow-tarjeta">
      <h1 className="text-xl font-bold text-ink-900">
        {perfil.rol === "talento" ? "Contanos sobre vos" : "Contanos sobre tu proyecto"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">
        Estás creando tu perfil como{" "}
        <strong>{perfil.rol === "talento" ? "Talento" : "Creador"}</strong>. Vas a poder sumar el
        otro más adelante.{" "}
        <Link
          href={next ? `/elegir-rol?next=${encodeURIComponent(next)}` : "/elegir-rol"}
          className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-2"
        >
          Empezar por el otro
        </Link>
      </p>
      {perfil.rol === "talento" ? (
        <FormularioTalento userId={user.id} esAlta fotosIniciales={[]} destinoAlTerminar={next} />
      ) : (
        <FormularioCreador userId={user.id} esAlta destinoAlTerminar={next} />
      )}
      </div>
    </main>
  );
}
