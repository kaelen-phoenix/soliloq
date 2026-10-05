import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calcularEdad,
  claveDisciplina,
  claveGenero,
  claveRed,
  etiquetaDisciplina,
  etiquetaGenero,
  etiquetaHabilidad,
  GENEROS,
  traductorCastellano,
} from "./constantes";
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

describe("etiquetas traducibles (#354)", () => {
  // Un traductor de mentira: devuelve la clave, para ver qué se le pidió.
  const t = (clave: string) => `[${clave}]`;

  it("sin traductor, el castellano sale del JSON", () => {
    expect(traductorCastellano("genero.varon")).toBe("Varón");
    expect(traductorCastellano("imagen.demasiadoGrande", { mb: 50, max: 40 })).toBe(
      "La imagen pesa 50 MB. Elegí uno de hasta 40 MB.",
    );
    expect(etiquetaGenero("sin_especificar")).toBe("Prefiero no decirlo");
    expect(etiquetaDisciplina("asistencia_direccion")).toBe("Asistencia de dirección");
    expect(GENEROS.map((g) => g.etiqueta)).toContain("No binarie");
  });
  it("las claves apuntan a perfil.etiquetas", () => {
    expect(claveGenero("mujer")).toBe("genero.mujer");
    expect(claveDisciplina("guion")).toBe("disciplina.guion");
    expect(claveRed("sitio")).toBe("red.sitio");
  });
  it("una habilidad de la lista se traduce; una escrita a mano queda como se guardó", () => {
    expect(etiquetaHabilidad("Doblaje / locución")).toBe("Doblaje / locución");
    expect(etiquetaHabilidad("Doblaje / locución", t)).toBe("[habilidad.doblaje]");
    expect(etiquetaHabilidad("Malabares", t)).toBe("Malabares");
  });
});
