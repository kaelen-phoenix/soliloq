import type { RolUsuario } from "@/lib/supabase/types";

export interface ItemNavegacion {
  href: string;
  /** Clave en el namespace `nav` de los mensajes. */
  clave: string;
  /** Clave del rótulo corto para la barra inferior, donde compite con otros y se corta. */
  claveCorto?: string;
  icono:
    | "feed"
    | "postulaciones"
    | "salas"
    | "perfil"
    | "tablero"
    | "corazon"
    | "buscar"
    | "admin";
}

/**
 * Única definición de la navegación. La barra inferior (móvil) y la lateral (escritorio)
 * son componentes distintos porque son formas distintas, pero leen de acá: si cada una
 * tuviera su lista, la app terminaría con dos navegaciones según el tamaño de pantalla.
 * El rótulo visible sale del namespace `nav` de i18n con `clave` / `claveCorto`.
 */
export const ITEMS_NAVEGACION: Record<RolUsuario, ItemNavegacion[]> = {
  talento: [
    { href: "/", clave: "convocatorias", claveCorto: "convocatoriasCorto", icono: "feed" },
    { href: "/salas", clave: "salas", icono: "salas" },
    { href: "/perfil", clave: "perfil", icono: "perfil" },
  ],
  // #217: la acción principal primero y Perfil al final, igual que en Talento (antes, por
  // #142, Perfil iba primero). "Buscar talento" sale de la barra y se ofrece desde la
  // pantalla de Proyecto (`TableroCreador`). "Salas" se muestra como "Chats" (i18n); la
  // ruta sigue siendo `/salas`.
  creador: [
    { href: "/", clave: "misProyectos", claveCorto: "misProyectosCorto", icono: "tablero" },
    { href: "/matches", clave: "matches", icono: "corazon" },
    { href: "/salas", clave: "salas", icono: "salas" },
    { href: "/perfil", clave: "perfil", icono: "perfil" },
  ],
};

const ITEM_ADMIN: ItemNavegacion = {
  href: "/admin",
  clave: "admin",
  claveCorto: "admin",
  icono: "admin",
};

/**
 * La lista de navegación para un usuario: la de su rol, más "Admin" al final si lo es.
 * El admin no es un rol (no entra en `ITEMS_NAVEGACION`), es un flag que suma un ítem.
 */
export function itemsParaNavegacion(
  rol: RolUsuario,
  { esAdmin = false }: { esAdmin?: boolean } = {}
): ItemNavegacion[] {
  return esAdmin ? [...ITEMS_NAVEGACION[rol], ITEM_ADMIN] : ITEMS_NAVEGACION[rol];
}

/** Ancla del tour guiado (#231) para un ítem: `nav-inicio`, `nav-salas`, `nav-matches`… */
export function idTourNav(href: string) {
  return href === "/" ? "nav-inicio" : `nav-${href.slice(1)}`;
}
