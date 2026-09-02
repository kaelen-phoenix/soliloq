import Link from "next/link";
import { MarcoAcceso } from "@/components/layout/marco-acceso";
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
    <MarcoAcceso>
      <div className="mb-8 mt-4 lg:mt-0">
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto">
          Tu contraseña
        </h1>
        <p className="mt-2.5 text-base leading-snug text-texto-tenue">
          Elegí una contraseña nueva para {user.email}.
        </p>
      </div>

      <CambiarClaveFormulario destinoAlTerminar={volver} />

      <Link
        href={volver}
        className="mt-5 self-start text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        Cancelar
      </Link>
    </MarcoAcceso>
  );
}
