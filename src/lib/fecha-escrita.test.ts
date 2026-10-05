import { describe, expect, it } from "vitest";
import { formatearMientrasSeEscribe, isoATexto, textoAIso } from "./fecha-escrita";

describe("isoATexto", () => {
  it("pasa ISO a dd/mm/aaaa", () => {
    expect(isoATexto("1995-05-07")).toBe("07/05/1995");
  });
  it("ignora la hora si viene", () => {
    expect(isoATexto("1995-05-07T00:00:00Z")).toBe("07/05/1995");
  });
  it("lo que no es ISO vuelve vacío", () => {
    expect(isoATexto(null)).toBe("");
    expect(isoATexto(undefined)).toBe("");
    expect(isoATexto("07/05/1995")).toBe("");
  });
});

describe("textoAIso", () => {
  it("pasa dd/mm/aaaa a ISO", () => {
    expect(textoAIso("07/05/1995")).toBe("1995-05-07");
  });
  it("acepta día y mes de un dígito y espacios alrededor", () => {
    expect(textoAIso(" 7/5/1995 ")).toBe("1995-05-07");
  });
  it("rechaza fechas que no existen", () => {
    expect(textoAIso("31/02/2000")).toBeNull();
    expect(textoAIso("29/02/2001")).toBeNull();
    expect(textoAIso("00/01/2000")).toBeNull();
    expect(textoAIso("10/13/2000")).toBeNull();
  });
  it("acepta el 29 de febrero de un año bisiesto", () => {
    expect(textoAIso("29/02/2000")).toBe("2000-02-29");
  });
  it("rechaza otros formatos", () => {
    expect(textoAIso("1995-05-07")).toBeNull();
    expect(textoAIso("07/05/95")).toBeNull();
    expect(textoAIso("")).toBeNull();
  });
});

describe("formatearMientrasSeEscribe", () => {
  it("pone las barras solas", () => {
    expect(formatearMientrasSeEscribe("07")).toBe("07");
    expect(formatearMientrasSeEscribe("0705")).toBe("07/05");
    expect(formatearMientrasSeEscribe("07051995")).toBe("07/05/1995");
  });
  it("descarta lo que no es dígito y corta en 8", () => {
    expect(formatearMientrasSeEscribe("07/05/1995")).toBe("07/05/1995");
    expect(formatearMientrasSeEscribe("0a7b0c5")).toBe("07/05");
    expect(formatearMientrasSeEscribe("070519951234")).toBe("07/05/1995");
  });
});
