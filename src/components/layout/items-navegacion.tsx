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
 *
 * #288: una sola app, sin modos Talento / Creador. Todos ven lo mismo: Explorar lo que se
 * está armando, sus Proyectos, sus Chats y su Perfil. "Salas" se muestra como "Chats" (i18n);
 * la ruta sigue siendo `/salas`.
 */
const EXPLORAR: ItemNavegacion = { href: "/", clave: "convocatorias", claveCorto: "convocatoriasCorto", icono: "feed" };
const PROYECTOS: ItemNavegacion = { href: "/proyectos", clave: "misProyectos", claveCorto: "misProyectosCorto", icono: "tablero" };
const MATCHES: ItemNavegacion = { href: "/matches", clave: "matches", icono: "corazon" };
const CHATS: ItemNavegacion = { href: "/salas", clave: "salas", icono: "salas" };
const PERFIL: ItemNavegacion = { href: "/perfil", clave: "perfil", icono: "perfil" };
const ADMIN: ItemNavegacion = { href: "/admin", clave: "admin", claveCorto: "admin", icono: "admin" };

/**
 * La lista de navegación para un usuario: la misma para todos (#298: Matches también sirve
 * a quien hizo match con un proyecto ajeno), más "Admin" al final si lo es: el admin no es
 * un rol, es un flag que suma un ítem.
 */
export function itemsParaNavegacion({ esAdmin = false }: { esAdmin?: boolean } = {}): ItemNavegacion[] {
  return [EXPLORAR, CHATS, PROYECTOS, MATCHES, PERFIL, ...(esAdmin ? [ADMIN] : [])];
}

/** Ancla del tour guiado (#231) para un ítem: `nav-inicio`, `nav-salas`, `nav-matches`… */
export function idTourNav(href: string) {
  return href === "/" ? "nav-inicio" : `nav-${href.slice(1)}`;
}

/** El ítem queda marcado también en sus pantallas hijas: una sala marca Chats, el buscador
 *  de talento marca Proyectos. */
export function esActivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/proyectos") return /^\/(proyectos|talentos)(\/|$)/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}
