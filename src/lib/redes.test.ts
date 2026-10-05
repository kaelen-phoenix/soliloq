import { describe, expect, it } from "vitest";
import { normalizarRed, validarRedes } from "./redes";

describe("normalizarRed", () => {
  it("un @usuario o usuario suelto se lleva a la URL de la red", () => {
    expect(normalizarRed("instagram", "@ana.actriz")).toBe("https://instagram.com/ana.actriz");
    expect(normalizarRed("instagram", "ana_actriz")).toBe("https://instagram.com/ana_actriz");
    expect(normalizarRed("tiktok", "@ana")).toBe("https://tiktok.com/@ana");
    expect(normalizarRed("youtube", "@canal")).toBe("https://youtube.com/@canal");
  });
  it("una URL de la red queda canónica: host principal, sin barra final ni query", () => {
    expect(normalizarRed("instagram", "https://www.instagram.com/ana/?hl=es")).toBe("https://instagram.com/ana");
    expect(normalizarRed("x", "twitter.com/ana")).toBe("https://x.com/ana");
  });
  it("YouTube conserva ?v= en /watch", () => {
    expect(normalizarRed("youtube", "https://www.youtube.com/watch?v=abc&t=10")).toBe(
      "https://youtube.com/watch?v=abc",
    );
  });
  it("es idempotente", () => {
    const una = normalizarRed("linkedin", "linkedin.com/in/ana-perez/")!;
    expect(normalizarRed("linkedin", una)).toBe(una);
  });
  it("rechaza enlaces de otra red y texto basura", () => {
    expect(normalizarRed("instagram", "https://tiktok.com/@ana")).toBeNull();
    expect(normalizarRed("instagram", "ana actriz!!")).toBeNull();
    expect(normalizarRed("instagram", "   ")).toBeNull();
  });
  it("sitio propio: cualquier dominio en https, nunca http explícito", () => {
    expect(normalizarRed("sitio", "anaperez.com.ar/")).toBe("https://anaperez.com.ar");
    expect(normalizarRed("sitio", "http://anaperez.com.ar")).toBeNull();
    expect(normalizarRed("sitio", "sinpunto")).toBeNull();
  });
});

describe("validarRedes", () => {
  it("separa las válidas de las que tienen error y omite las vacías", () => {
    const { redes, errores } = validarRedes({ instagram: "@ana", tiktok: "", x: "https://instagram.com/ana" });
    expect(redes).toEqual({ instagram: "https://instagram.com/ana" });
    expect(Object.keys(errores)).toEqual(["x"]);
  });
});
