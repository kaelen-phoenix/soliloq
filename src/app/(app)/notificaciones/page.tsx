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
    .select(
      "id, tipo, leida_en, creado_en, obra_id, rol_id, sala_id, obras(titulo, perfiles_creador(nombre, imagen_url))"
    )
    .eq("destinatario_id", user.id)
    .order("creado_en", { ascending: false });

  // La foto propia, para el par de avatares del aviso de equipo armado. El talento guarda
  // varias fotos ordenadas y la principal es la primera: no hay una columna "principal".
  const { data: foto } = await supabase
    .from("fotos_talento")
    .select("storage_path")
    .eq("talento_id", user.id)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  const fotoPropia = foto
    ? supabase.storage.from("fotos-perfil").getPublicUrl(foto.storage_path).data.publicUrl
    : null;

  return (
    <main className="px-6 py-6">
      <ListaNotificaciones
        notificacionesIniciales={notificaciones ?? []}
        fotoPropia={fotoPropia}
      />
    </main>
  );
}
