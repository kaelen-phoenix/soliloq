export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LARGO_MINIMO_CLAVE = 8;

/**
 * Clave del error en `cuenta.errores` de los mensajes (#354): el texto lo pone el formulario,
 * en el idioma de quien lo ve. `claveCorta` lleva el parámetro `minimo` (`LARGO_MINIMO_CLAVE`).
 */
export type ErrorAuth =
  | "claveCorta"
  | "credenciales"
  | "emailSinConfirmar"
  | "yaExiste"
  | "demasiadosIntentos"
  | "mismaClave"
  | "emailNoValido"
  | "emailNoAutorizado"
  | "altaDeshabilitada"
  | "suspendida"
  | "sesionVencida"
  | "enlaceVencido"
  | "generico";

/** Devuelve la clave del error, o null si la contraseña sirve. */
export function validarClave(clave: string): "claveCorta" | null {
  if (clave.length < LARGO_MINIMO_CLAVE) return "claveCorta";
  return null;
}

/**
 * Traduce los errores de Supabase Auth a la clave de un mensaje propio.
 * Los códigos que no reconocemos caen en un mensaje genérico.
 */
export function mensajeErrorAuth(codigo: string | undefined): ErrorAuth {
  switch (codigo) {
    case "invalid_credentials":
      return "credenciales";
    case "email_not_confirmed":
      return "emailSinConfirmar";
    case "user_already_exists":
    case "email_exists":
      return "yaExiste";
    case "weak_password":
      return "claveCorta";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "demasiadosIntentos";
    case "same_password":
      return "mismaClave";
    case "email_address_invalid":
    case "validation_failed":
      return "emailNoValido";
    case "email_address_not_authorized":
      return "emailNoAutorizado";
    case "signup_disabled":
      return "altaDeshabilitada";
    case "user_banned":
      return "suspendida";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
      return "sesionVencida";
    case "otp_expired":
      return "enlaceVencido";
    default:
      // #349: el texto de Supabase viene en inglés; nunca se muestra tal cual.
      return "generico";
  }
}

/**
 * El origen real del navegador, no una variable de build: así el redirect es correcto
 * en producción, en cada deploy de preview y en local, sin depender de configuración.
 */
export function urlCallback(destino?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  return destino ? `${base}?next=${encodeURIComponent(destino)}` : base;
}
