import { TableroCreador } from "@/components/convocatorias/tablero-creador";
import { FeedTalento } from "@/components/feed/feed-talento";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const estado = await leerEstadoCuenta(supabase, user.id);

  if (estado.modoActivo === "talento") {
    return <FeedTalento talentoId={user.id} />;
  }

  return <TableroCreador creadorId={user.id} />;
}
