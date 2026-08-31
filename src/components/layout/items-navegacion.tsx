import type { RolUsuario } from "@/lib/supabase/types";

export interface ItemNavegacion {
  href: string;
  label: string;
  icono: "feed" | "postulaciones" | "salas" | "perfil" | "tablero" | "corazon" | "buscar";
  /** Rótulo corto para la barra inferior, donde compite con otros tres y se corta. */
  labelCorto?: string;
}

/**
 * Única definición de la navegación. La barra inferior (móvil) y la lateral (escritorio)
 * son componentes distintos porque son formas distintas, pero leen de acá: si cada una
 * tuviera su lista, la app terminaría con dos navegaciones según el tamaño de pantalla.
 */
export const ITEMS_NAVEGACION: Record<RolUsuario, ItemNavegacion[]> = {
  talento: [
    { href: "/", label: "Convocatorias", labelCorto: "Feed", icono: "feed" },
    { href: "/postulaciones", label: "Postulaciones", icono: "postulaciones" },
    { href: "/equipo", label: "Armar equipo", labelCorto: "Equipo", icono: "corazon" },
    { href: "/salas", label: "Salas", icono: "salas" },
    { href: "/perfil", label: "Perfil", icono: "perfil" },
  ],
  creador: [
    { href: "/", label: "Mis proyectos", labelCorto: "Proyectos", icono: "tablero" },
    { href: "/talentos", label: "Buscar talento", labelCorto: "Buscar", icono: "buscar" },
    { href: "/equipo", label: "Armar equipo", labelCorto: "Equipo", icono: "corazon" },
    { href: "/salas", label: "Salas", icono: "salas" },
    { href: "/perfil", label: "Perfil", icono: "perfil" },
  ],
};
