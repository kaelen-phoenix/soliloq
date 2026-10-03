import { TableroCreador } from "@/components/convocatorias/tablero-creador";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

export const metadata = { title: "Mis proyectos — Yalope" };

/** Los Proyectos y Equipos propios. Sin modo Creador (#288): cualquiera arma el suyo desde acá. */
export default async function ProyectosPage() {
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  return <TableroCreador creadorId={user.id} />;
}
