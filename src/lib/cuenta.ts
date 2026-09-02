import type { RolUsuario } from "./supabase/types";

export interface EstadoCuenta {
  /** Rol con el que arrancó; null si todavía no eligió. */
  rolInicial: RolUsuario | null;
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
  rol: RolUsuario | null;
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

  // El modo guardado puede apuntar a un perfil inexistente si se manipuló la base.
  // Preferimos degradar al perfil que sí existe antes que dejar a la persona afuera.
  const modoEsUsable =
    (modoGuardado === "talento" && tienePerfilTalento) ||
    (modoGuardado === "creador" && tienePerfilCreador);

  let modoActivo: RolUsuario | null = null;
  if (modoEsUsable) {
    modoActivo = modoGuardado;
  } else if (tienePerfilTalento) {
    modoActivo = "talento";
  } else if (tienePerfilCreador) {
    modoActivo = "creador";
  }

  return {
    rolInicial: perfil?.rol ?? null,
    tienePerfilTalento,
    tienePerfilCreador,
    modoActivo,
    tieneAmbosPerfiles: tienePerfilTalento && tienePerfilCreador,
    esAdmin: perfil?.es_admin ?? false,
    suspendido: perfil?.suspendido_en != null,
  };
}

export type Destino = "ingresar" | "elegir-rol" | "completar-perfil" | "app";

/**
 * Única fuente de decisión de redirección. Se evalúa en orden y sin ramas
 * cruzadas, que es lo que evita los bucles.
 */
export function destinoSegunEstado(estado: EstadoCuenta): Destino {
  if (!estado.rolInicial) return "elegir-rol";
  if (!estado.tienePerfilTalento && !estado.tienePerfilCreador) return "completar-perfil";
  return "app";
}

export function rutaPrincipal(): string {
  return "/";
}

/** El rol cuyo perfil todavía no existe, o null si ya tiene los dos. */
export function rolFaltante(estado: EstadoCuenta): RolUsuario | null {
  if (!estado.tienePerfilTalento) return "talento";
  if (!estado.tienePerfilCreador) return "creador";
  return null;
}
