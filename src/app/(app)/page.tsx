import { TableroCreador } from "@/components/convocatorias/tablero-creador";
import { FeedTalento } from "@/components/feed/feed-talento";
import { createClient } from "@/lib/supabase/server";
import { usuarioDeLaRequest, estadoCuentaDeLaRequest } from "@/lib/sesion-servidor";

export default async function InicioPage() {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const estado = await estadoCuentaDeLaRequest(user.id);

  if (estado.modoActivo === "talento") {
    return <FeedTalento talentoId={user.id} />;
  }

  return <TableroCreador creadorId={user.id} />;
}
