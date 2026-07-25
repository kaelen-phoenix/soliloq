import { createClient } from "@/lib/supabase/server";
import { ListaNotificaciones } from "@/components/notificaciones/lista-notificaciones";

export default async function NotificacionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notificaciones } = await supabase
    .from("notificaciones")
    .select("id, tipo, leida_en, creado_en, obra_id, rol_id, sala_id, obras(titulo)")
    .eq("destinatario_id", user.id)
    .order("creado_en", { ascending: false });

  return (
    <main className="px-6 py-6">
      <ListaNotificaciones notificacionesIniciales={notificaciones ?? []} />
    </main>
  );
}
