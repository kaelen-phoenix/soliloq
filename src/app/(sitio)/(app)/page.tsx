import { FeedTalento } from "@/components/feed/feed-talento";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

/** Explorar: lo que se está armando. Los Proyectos propios viven en `/proyectos` (#288). */
export default async function InicioPage() {
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  return <FeedTalento talentoId={user.id} />;
}
