export interface EstadoCuenta {
  tienePerfilTalento: boolean;
  tienePerfilCreador: boolean;
  tieneAmbosPerfiles: boolean;
  /** Flag de administrador de la app (no es un rol). */
  esAdmin: boolean;
  /** La cuenta está suspendida por un admin. */
  suspendido: boolean;
  /**
   * Mientras se prueba la app, nadie entra sin invitación o aprobación manual. `true` para
   * toda cuenta que ya existía antes de este control (no es retroactivo).
   */
  aprobado: boolean;
  /** Aceptó las Normas de la Comunidad (issue #180). No es retroactivo. */
  normasAceptadas: boolean;
  /** Ya vio (u omitió) el tour guiado (#231, 0084). Desde #288 hay uno solo. */
  tourVisto: boolean;
}

interface FilaPerfil {
  es_admin?: boolean | null;
  suspendido_en?: string | null;
  aprobado_en?: string | null;
  normas_aceptadas_en?: string | null;
  tour_talento_visto_en?: string | null;
}

/**
 * Resuelve el estado de la cuenta en un solo lugar. El onboarding se evalúa por
 * los perfiles que existen, no por una bandera aparte, porque esa bandera puede
 * desincronizarse y las filas de perfil no.
 */
export function resolverEstadoCuenta(
  perfil: FilaPerfil | null,
  tienePerfilTalento: boolean,
  tienePerfilCreador: boolean
): EstadoCuenta {
  return {
    tienePerfilTalento,
    tienePerfilCreador,
    tieneAmbosPerfiles: tienePerfilTalento && tienePerfilCreador,
    esAdmin: perfil?.es_admin ?? false,
    suspendido: perfil?.suspendido_en != null,
    aprobado: perfil?.aprobado_en != null,
    normasAceptadas: perfil?.normas_aceptadas_en != null,
    // Sin fila de perfil no hay a quién mostrarle nada: se toma como visto.
    tourVisto: perfil ? perfil.tour_talento_visto_en != null : true,
  };
}

export type Destino =
  | "ingresar"
  | "solicitud-pendiente"
  | "aceptar-normas"
  | "completar-perfil"
  | "app";

/**
 * Única fuente de decisión de redirección. Se evalúa en orden y sin ramas
 * cruzadas, que es lo que evita los bucles.
 *
 * La aprobación se resuelve antes que el onboarding: mientras la app está en prueba, una
 * cuenta sin invitación ni aprobación manual no llega ni a completar su Perfil de Talento.
 *
 * Aceptar las Normas de la Comunidad (issue #180) va justo después: ninguna cuenta nueva
 * completa su Perfil de Talento ni crea un Proyecto/Equipo sin aceptarlas primero. No es
 * retroactivo — sólo aplica a partir de acá.
 *
 * El Perfil de Talento es el único perfil personal (issue #175): sin él, el
 * onboarding está incompleto. La función de Creador no tiene alta propia — se
 * activa sola al crear el primer Proyecto o Equipo (0075) y no bloquea nada acá.
 */
export function destinoSegunEstado(estado: EstadoCuenta): Destino {
  if (!estado.aprobado) return "solicitud-pendiente";
  if (!estado.normasAceptadas) return "aceptar-normas";
  if (!estado.tienePerfilTalento) return "completar-perfil";
  return "app";
}

export function rutaPrincipal(): string {
  return "/";
}

