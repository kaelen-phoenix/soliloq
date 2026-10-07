import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("cuenta.cambiarClave");

  // Sólo se aceptan destinos internos, para no convertir esto en un redirect abierto.
  const volver =
    searchParams.volver?.startsWith("/") && !searchParams.volver.startsWith("//")
      ? searchParams.volver
      : "/";

  return (
    <MarcoAcceso>
      <div className="mb-8 mt-4 lg:mt-0">
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto">
          {t("titulo")}
        </h1>
        <p className="mt-2.5 text-base leading-snug text-texto-tenue">
          {t("bajada", { email: user.email ?? "" })}
        </p>
      </div>

      <CambiarClaveFormulario destinoAlTerminar={volver} />

      <Link
        href={volver}
        className="mt-5 self-start text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        {t("cancelar")}
      </Link>
    </MarcoAcceso>
  );
}
