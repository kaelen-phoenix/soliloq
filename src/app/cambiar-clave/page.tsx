import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CambiarClaveFormulario } from "./cambiar-clave-formulario";

export default async function CambiarClavePage({
  searchParams,
}: {
  searchParams: { volver?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  // Sólo se aceptan destinos internos, para no convertir esto en un redirect abierto.
  const volver =
    searchParams.volver?.startsWith("/") && !searchParams.volver.startsWith("//")
      ? searchParams.volver
      : "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink-900">
          Tu contraseña
        </h1>
        <p className="mt-2.5 text-[15px] leading-snug text-ink-500">
          Elegí una contraseña nueva para {user.email}.
        </p>
      </div>

      <CambiarClaveFormulario destinoAlTerminar={volver} />

      <Link
        href={volver}
        className="mt-5 self-start text-[13px] text-ink-500 underline underline-offset-4 hover:text-ink-900"
      >
        Cancelar
      </Link>
    </main>
  );
}
