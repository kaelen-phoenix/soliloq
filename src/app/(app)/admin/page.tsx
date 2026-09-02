import { notFound } from "next/navigation";
import { PanelAdmin } from "@/components/admin/panel-admin";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Yalope", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const estado = await leerEstadoCuenta(supabase, user.id);
  // 404 y no "no autorizado": no se confirma que la ruta exista para quien no es admin.
  if (!estado.esAdmin) notFound();

  const [{ data: metricas }, { data: usuarios }] = await Promise.all([
    supabase.rpc("admin_metricas"),
    supabase.rpc("admin_usuarios", { p_limite: 50, p_offset: 0 }),
  ]);

  return (
    <main className="px-5 py-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto sm:text-2xl">
        Administración
      </h1>
      <p className="mb-5 mt-1 text-sm text-texto-tenue">
        Métricas, usuarios, denuncias y bloqueos de la plataforma.
      </p>
      <PanelAdmin
        metricas={metricas?.[0] ?? null}
        usuariosIniciales={usuarios ?? []}
        miId={user.id}
      />
    </main>
  );
}
