export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LARGO_MINIMO_CLAVE = 8;

/** Devuelve el mensaje de error, o null si la contraseña sirve. */
export function validarClave(clave: string): string | null {
  if (clave.length < LARGO_MINIMO_CLAVE) {
    return `La contraseña necesita al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  }
  return null;
}

/**
 * Traduce los errores de Supabase Auth a mensajes en castellano.
 * Los códigos que no reconocemos caen en un mensaje genérico.
 */
export function mensajeErrorAuth(codigo: string | undefined, mensaje: string): string {
  switch (codigo) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu correo y abrí el enlace.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese email. Probá ingresando.";
    case "weak_password":
      return `La contraseña necesita al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
    case "same_password":
      return "La contraseña nueva tiene que ser distinta de la actual.";
    case "email_address_invalid":
    case "validation_failed":
      return "Ese email no parece válido. Revisalo y probá de nuevo.";
    case "email_address_not_authorized":
      return "No pudimos mandarle un correo a ese email. Probá con otro.";
    case "signup_disabled":
      return "Por ahora no se pueden crear cuentas nuevas.";
    case "user_banned":
      return "Esta cuenta está suspendida.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
      return "Tu sesión venció. Volvé a ingresar.";
    case "otp_expired":
      return "El enlace venció. Pedí uno nuevo.";
    default:
      // #349: el texto de Supabase viene en inglés; nunca se muestra tal cual.
      return "Algo salió mal. Probá de nuevo en unos minutos.";
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
