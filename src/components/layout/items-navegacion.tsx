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
    { href: "/postulaciones", clave: "postulaciones", icono: "postulaciones" },
    { href: "/equipo", clave: "armarEquipo", claveCorto: "armarEquipoCorto", icono: "corazon" },
    { href: "/salas", clave: "salas", icono: "salas" },
    { href: "/perfil", clave: "perfil", icono: "perfil" },
  ],
  creador: [
    { href: "/", clave: "misProyectos", claveCorto: "misProyectosCorto", icono: "tablero" },
    { href: "/talentos", clave: "buscarTalento", claveCorto: "buscarTalentoCorto", icono: "buscar" },
    { href: "/equipo", clave: "armarEquipo", claveCorto: "armarEquipoCorto", icono: "corazon" },
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
