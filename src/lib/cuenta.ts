import type { RolUsuario } from "./supabase/types";

export interface EstadoCuenta {
  tienePerfilTalento: boolean;
  tienePerfilCreador: boolean;
  /** Modo en el que opera efectivamente, ya corregido contra los perfiles que existen. */
  modoActivo: RolUsuario | null;
  tieneAmbosPerfiles: boolean;
  /** Flag de administrador de la app (no es un rol). */
  esAdmin: boolean;
  /** La cuenta está suspendida por un admin. */
  suspendido: boolean;
}

interface FilaPerfil {
  modo_activo: RolUsuario | null;
  es_admin?: boolean | null;
  suspendido_en?: string | null;
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
  const modoGuardado = perfil?.modo_activo ?? null;

  // El modo `creador` ya no exige que exista la fila de `perfiles_creador`: se activa sola
  // al crear el primer Proyecto o Equipo (0075), así que entrar a ese modo con las manos
  // vacías es válido — el tablero muestra el estado inicial para armar el primero. El modo
  // `talento` sí puede apuntar a un perfil inexistente si se manipuló la base; ahí preferimos
  // degradar al que sí existe antes que dejar a la persona afuera.
  const modoEsUsable = modoGuardado === "creador" || (modoGuardado === "talento" && tienePerfilTalento);

  let modoActivo: RolUsuario | null = null;
  if (modoEsUsable) {
    modoActivo = modoGuardado;
  } else if (tienePerfilTalento) {
    modoActivo = "talento";
  } else if (tienePerfilCreador) {
    modoActivo = "creador";
  }

  return {
    tienePerfilTalento,
    tienePerfilCreador,
    modoActivo,
    tieneAmbosPerfiles: tienePerfilTalento && tienePerfilCreador,
    esAdmin: perfil?.es_admin ?? false,
    suspendido: perfil?.suspendido_en != null,
  };
}

export type Destino = "ingresar" | "completar-perfil" | "app";

/**
 * Única fuente de decisión de redirección. Se evalúa en orden y sin ramas
 * cruzadas, que es lo que evita los bucles.
 *
 * El Perfil de Talento es el único perfil personal (issue #175): sin él, el
 * onboarding está incompleto. La función de Creador no tiene alta propia — se
 * activa sola al crear el primer Proyecto o Equipo (0075) y no bloquea nada acá.
 */
export function destinoSegunEstado(estado: EstadoCuenta): Destino {
  if (!estado.tienePerfilTalento) return "completar-perfil";
  return "app";
}

export function rutaPrincipal(): string {
  return "/";
}

