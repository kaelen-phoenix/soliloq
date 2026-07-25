import { createClient } from "@/lib/supabase/server";
import { FeedTalento } from "@/components/feed/feed-talento";
import { TableroCreador } from "@/components/convocatorias/tablero-creador";

export default async function InicioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();

  if (perfil?.rol === "talento") {
    return <FeedTalento talentoId={user.id} />;
  }

  return <TableroCreador creadorId={user.id} />;
}
