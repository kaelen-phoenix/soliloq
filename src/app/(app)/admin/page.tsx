import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PanelAdmin } from "@/components/admin/panel-admin";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { usuarioDeLaRequest, estadoCuentaDeLaRequest } from "@/lib/sesion-servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.pagina");
  return { title: t("metaTitulo"), robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) notFound();

  const estado = await estadoCuentaDeLaRequest(user.id);
  // 404 y no "no autorizado": no se confirma que la ruta exista para quien no es admin.
  if (!estado.esAdmin) notFound();

  const [
    { data: metricas, error: errorMetricas },
    { data: usuarios, error: errorUsuarios },
  ] = await Promise.all([
    supabase.rpc("admin_metricas"),
    supabase.rpc("admin_usuarios", { p_limite: 50, p_offset: 0 }),
  ]);
  if (errorMetricas) reportarErrorSupabase(errorMetricas, { rpc: "admin_metricas" });
  if (errorUsuarios) reportarErrorSupabase(errorUsuarios, { rpc: "admin_usuarios" });
  const t = await getTranslations("admin.pagina");

  return (
    <main className="px-5 py-5">
      <p className="mb-5 text-sm text-texto-tenue">
        {t("intro")}
      </p>
      <PanelAdmin
        metricas={metricas?.[0] ?? null}
        usuariosIniciales={usuarios ?? []}
        miId={user.id}
      />
    </main>
  );
}
