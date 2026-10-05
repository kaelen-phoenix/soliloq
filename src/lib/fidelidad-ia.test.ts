import { describe, expect, it } from "vitest";
import { revisarFidelidad } from "./fidelidad-ia";

const ORIGINAL =
  "estudie teatro con Lucia Perez en 2019. hice improvisacion y un corto. canto y bailo tango.";

describe("revisarFidelidad (#317)", () => {
  it("acepta una reescritura del mismo contenido", () => {
    const propuesta =
      "Estudié teatro con Lucía Pérez en 2019. Tengo experiencia en improvisación y participé en un cortometraje. Además, canto y bailo tango.";
    expect(revisarFidelidad(ORIGINAL, propuesta)).toEqual({ ok: true });
  });
  it("rechaza un año que la persona no escribió", () => {
    const propuesta = "Estudié teatro con Lucía Pérez en 2019 y en 2021. Canto y bailo tango.";
    expect(revisarFidelidad(ORIGINAL, propuesta)).toEqual({ ok: false, motivo: "inventado" });
  });
  it("rechaza un nombre propio nuevo", () => {
    const propuesta = "Estudié teatro con Lucía Pérez en 2019 y con Ricardo Bartís. Canto y bailo tango.";
    expect(revisarFidelidad(ORIGINAL, propuesta)).toEqual({ ok: false, motivo: "inventado" });
  });
  it("rechaza cuando el modelo pide datos en vez de reescribir", () => {
    const propuesta = "No encontré información suficiente. Por favor enviá más detalles sobre tu formación.";
    expect(revisarFidelidad("hola", propuesta)).toEqual({ ok: false, motivo: "sin_datos" });
  });
  it("rechaza un texto mucho más largo que el original", () => {
    expect(revisarFidelidad("actor", "actor ".repeat(100))).toEqual({ ok: false, motivo: "inventado" });
  });
  it("#354: en inglés, acepta la reescritura y detecta el pedido de datos", () => {
    const original = "studied acting with Lucia Perez in 2019. did improv and a short film. i sing and dance tango.";
    const propuesta =
      "I studied acting with Lucia Perez in 2019. I have experience in improv and performed in a short film. I also sing and dance tango.";
    expect(revisarFidelidad(original, propuesta)).toEqual({ ok: true });
    expect(revisarFidelidad("hi", "I couldn't find enough details. Please provide more information.")).toEqual({
      ok: false,
      motivo: "sin_datos",
    });
  });
  it("rechaza un texto que es mayormente otro", () => {
    const propuesta =
      "Apasionada comunicadora, enfocada siempre, generando vínculos auténticos, transmitiendo emociones profundas, explorando lenguajes contemporáneos.";
    expect(revisarFidelidad(ORIGINAL, propuesta)).toEqual({ ok: false, motivo: "inventado" });
  });
});
