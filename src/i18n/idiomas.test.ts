import { describe, expect, it } from "vitest";
import { detectarIdioma, esRutaPorIdioma, rutaPublica, separarIdioma } from "./idiomas";

describe("idioma en la URL (#237)", () => {
  it("separa el prefijo de idioma", () => {
    expect(separarIdioma("/en/normas")).toEqual({ idioma: "en", resto: "/normas" });
    expect(separarIdioma("/es/terminos")).toEqual({ idioma: "es", resto: "/terminos" });
    expect(separarIdioma("/en")).toEqual({ idioma: "en", resto: "/" });
    expect(separarIdioma("/normas")).toEqual({ idioma: null, resto: "/normas" });
    // Una ruta que solo empieza con esas letras no es un prefijo.
    expect(separarIdioma("/ensayos")).toEqual({ idioma: null, resto: "/ensayos" });
  });

  it("reconoce las páginas públicas por idioma", () => {
    expect(esRutaPorIdioma("/bienvenida")).toBe(true);
    expect(esRutaPorIdioma("/privacidad")).toBe(true);
    expect(esRutaPorIdioma("/ingresar")).toBe(false);
    expect(esRutaPorIdioma("/normas-viejas")).toBe(false);
  });

  it("arma la URL de una página pública en cada idioma", () => {
    expect(rutaPublica("es", "/terminos")).toBe("/terminos");
    expect(rutaPublica("en", "/terminos")).toBe("/en/terminos");
  });

  it("detecta el idioma del navegador", () => {
    expect(detectarIdioma("en-US,en;q=0.9")).toBe("en");
    expect(detectarIdioma("es-AR,es;q=0.9,en;q=0.8")).toBe("es");
    expect(detectarIdioma("pt-BR")).toBe("es");
    expect(detectarIdioma(null)).toBe("es");
  });
});
