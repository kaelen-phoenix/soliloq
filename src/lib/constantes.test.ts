import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calcularEdad } from "./constantes";
import { tagPush } from "./notificaciones-cliente";

describe("calcularEdad", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12)); // 5 de octubre de 2026
  });
  afterEach(() => vi.useRealTimers());

  it("cuenta los años cumplidos", () => {
    expect(calcularEdad("1990-01-15")).toBe(36);
  });
  it("si todavía no cumplió este año, uno menos", () => {
    expect(calcularEdad("1990-12-01")).toBe(35);
    expect(calcularEdad("1990-10-06")).toBe(35);
  });
  it("el día del cumpleaños ya cuenta", () => {
    expect(calcularEdad("2010-10-05")).toBe(16);
  });
});

describe("tagPush (#347)", () => {
  it("el tag con que se mandó cada push", () => {
    expect(tagPush({ tipo: "acceso_habilitado" })).toBe("acceso-habilitado");
    expect(tagPush({ tipo: "solicitud_acceso", de_perfil: "p1" })).toBe("solicitud-p1");
    expect(tagPush({ tipo: "solicitud_acceso" })).toBe("solicitud-acceso");
    expect(tagPush({ tipo: "match" })).toBeNull();
  });
});
