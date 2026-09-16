import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FormularioAceptarNormas } from "@/components/normas/formulario-aceptar-normas";
import { Logotipo } from "@/components/ui/logotipo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Normas de la Comunidad — Yalope",
  robots: { index: false, follow: false },
};

/**
 * Paso obligatorio para toda cuenta nueva (issue #180), justo después del alta y antes de
 * `/completar-perfil`. El gate real está en el middleware (`destinoSegunEstado`); esta
 * pantalla es donde efectivamente se acepta. Fuera del grupo `(app)` por el mismo motivo
 * que `/solicitud-pendiente` y `/suspendido`: corre antes de que haya modo activo.
 */
export default async function AceptarNormasPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : undefined;

  const t = await getTranslations("aceptarNormas");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Logotipo tamano="sm" />
      <h1 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em] text-texto">
        {t("titulo")}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-texto-tenue">{t("texto")}</p>
      <div className="mt-6">
        <FormularioAceptarNormas next={next} />
      </div>
    </main>
  );
}
