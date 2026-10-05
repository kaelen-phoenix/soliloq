import { describe, expect, it } from "vitest";
import {
  aColumnas,
  desdeColumnas,
  metrosAUnidad,
  opcionesDeRadio,
  radioMasCercano,
  unidadAMetros,
  unidadPorPais,
} from "./ubicacion";

describe("unidades", () => {
  it("millas solo en los países que las usan", () => {
    expect(unidadPorPais("us")).toBe("mi");
    expect(unidadPorPais("GB")).toBe("mi");
    expect(unidadPorPais("AR")).toBe("km");
  });
  it("convierte ida y vuelta", () => {
    expect(unidadAMetros(10, "km")).toBe(10_000);
    expect(metrosAUnidad(10_000, "km")).toBe(10);
    expect(Math.round(metrosAUnidad(unidadAMetros(5, "mi"), "mi"))).toBe(5);
  });
});

describe("radio de búsqueda", () => {
  it("la última opción es todo el mundo", () => {
    const opciones = opcionesDeRadio("km");
    expect(opciones.at(-1)).toEqual({ etiqueta: "Todo el mundo", metros: null });
    expect(opciones[0]).toEqual({ etiqueta: "5 km", metros: 5_000 });
  });
  it("elige el paso más cercano, también al cambiar de unidad", () => {
    expect(radioMasCercano(null, "km").metros).toBeNull();
    expect(radioMasCercano(24_000, "km").etiqueta).toBe("25 km");
    // 50 km ≈ 31 mi: el paso de millas más cercano es 25.
    expect(radioMasCercano(50_000, "mi").etiqueta).toBe("25 millas");
  });
});

describe("columnas de ubicación", () => {
  const ubicacion = {
    texto: "Av. Corrientes 1234, Buenos Aires",
    publica: "San Nicolás, Buenos Aires",
    placeId: "abc",
    lat: -34.6,
    lng: -58.38,
    pais: "AR",
  };
  it("ida y vuelta sin perder nada", () => {
    expect(desdeColumnas(aColumnas(ubicacion))).toEqual(ubicacion);
  });
  it("filas viejas sin ubicación pública caen al texto completo", () => {
    const fila = { ...aColumnas(ubicacion), ubicacion_publica: undefined };
    expect(desdeColumnas(fila)?.publica).toBe(ubicacion.texto);
  });
  it("sin coordenadas no hay ubicación", () => {
    expect(desdeColumnas(null)).toBeNull();
    expect(desdeColumnas({ ubicacion_texto: "x" })).toBeNull();
  });
});
