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
    <main className="min-h-screen px-6 py-10 sm:bg-fondo-sutil sm:py-14">
      <div className="mx-auto max-w-lg sm:rounded-2xl sm:border sm:border-borde sm:bg-superficie sm:p-8 sm:shadow-tarjeta">
      <h1 className="text-xl font-bold text-texto">
        {perfil.rol === "talento" ? "Contanos sobre vos" : "Contanos sobre tu proyecto"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-texto-tenue">
        Estás creando tu perfil como{" "}
        <strong>{perfil.rol === "talento" ? "Talento" : "Creador"}</strong>. Vas a poder sumar el
        otro más adelante.{" "}
        <Link
          href={next ? `/elegir-rol?next=${encodeURIComponent(next)}` : "/elegir-rol"}
          className="font-medium text-texto underline decoration-ink-300 underline-offset-2"
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
