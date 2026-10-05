import { describe, expect, it } from "vitest";
import { EMAIL_REGEX, LARGO_MINIMO_CLAVE, mensajeErrorAuth, validarClave } from "./clave";

describe("validarClave", () => {
  it("pide el largo mínimo", () => {
    expect(validarClave("a".repeat(LARGO_MINIMO_CLAVE - 1))).toMatch(/al menos/);
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
    expect(mensajeErrorAuth("invalid_credentials", "")).toBe("Email o contraseña incorrectos.");
    expect(mensajeErrorAuth("email_exists", "")).toMatch(/Ya existe una cuenta/);
    expect(mensajeErrorAuth("user_already_exists", "")).toMatch(/Ya existe una cuenta/);
    expect(mensajeErrorAuth("over_email_send_rate_limit", "")).toMatch(/Demasiados intentos/);
    expect(mensajeErrorAuth("email_address_invalid", "")).toMatch(/no parece válido/);
    expect(mensajeErrorAuth("session_expired", "")).toMatch(/sesión venció/);
  });
  it("#349: nunca muestra el texto en inglés de Supabase", () => {
    const ingles = "Email address is invalid for some reason";
    expect(mensajeErrorAuth(undefined, ingles)).toBe("Algo salió mal. Probá de nuevo en unos minutos.");
    expect(mensajeErrorAuth("codigo_nuevo", ingles)).not.toContain(ingles);
  });
});
