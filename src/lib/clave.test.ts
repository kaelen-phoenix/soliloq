import { describe, expect, it } from "vitest";
import es from "@/mensajes/es/cuenta.json";
import en from "@/mensajes/en/cuenta.json";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth, validarClave, type ErrorAuth } from "./clave";

/** El texto en castellano que ve la persona para una clave de error (#354). */
function texto(clave: ErrorAuth | null) {
  return clave && es.cuenta.errores[clave].replace("{minimo}", String(LARGO_MINIMO_CLAVE));
}

describe("validarClave", () => {
  it("pide el largo mínimo", () => {
    expect(texto(validarClave("a".repeat(LARGO_MINIMO_CLAVE - 1)))).toMatch(/al menos 8/);
    expect(validarClave("a".repeat(LARGO_MINIMO_CLAVE))).toBeNull();
  });
});

describe("EMAIL_REGEX", () => {
  it("acepta un email común y rechaza lo que no lo es", () => {
    expect(EMAIL_REGEX.test("ana@yalope.com")).toBe(true);
    expect(EMAIL_REGEX.test("ana@yalope")).toBe(false);
    expect(EMAIL_REGEX.test("ana yalope.com")).toBe(false);
  });
});

describe("mensajeErrorAuth", () => {
  it("traduce los códigos conocidos", () => {
    expect(texto(mensajeErrorAuth("invalid_credentials"))).toBe("Email o contraseña incorrectos.");
    expect(texto(mensajeErrorAuth("email_exists"))).toMatch(/Ya existe una cuenta/);
    expect(texto(mensajeErrorAuth("user_already_exists"))).toMatch(/Ya existe una cuenta/);
    expect(texto(mensajeErrorAuth("over_email_send_rate_limit"))).toMatch(/Demasiados intentos/);
    expect(texto(mensajeErrorAuth("email_address_invalid"))).toMatch(/no parece válido/);
    expect(texto(mensajeErrorAuth("session_expired"))).toMatch(/sesión venció/);
  });

  it("#349: un código desconocido cae en el genérico, nunca en el texto de Supabase", () => {
    expect(texto(mensajeErrorAuth(undefined))).toBe("Algo salió mal. Probá de nuevo en unos minutos.");
    expect(mensajeErrorAuth("codigo_nuevo")).toBe("generico");
  });

  it("#354: cada clave de error tiene texto en los dos idiomas", () => {
    const codigos = [
      "invalid_credentials",
      "email_not_confirmed",
      "email_exists",
      "weak_password",
      "over_request_rate_limit",
      "same_password",
      "validation_failed",
      "email_address_not_authorized",
      "signup_disabled",
      "user_banned",
      "session_expired",
      "otp_expired",
      undefined,
    ];
    for (const codigo of codigos) {
      const clave = mensajeErrorAuth(codigo);
      expect(es.cuenta.errores[clave]).toBeTruthy();
      expect(en.cuenta.errores[clave]).toBeTruthy();
    }
  });
});
