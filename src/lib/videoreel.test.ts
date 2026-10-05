import { describe, expect, it } from "vitest";
import { esVideoreelValido, parsearVideoreel, urlEmbedVideoreel } from "./videoreel";

const ID = "dQw4w9WgXcQ";

describe("parsearVideoreel", () => {
  it("YouTube en sus formas comunes", () => {
    for (const enlace of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?feature=share&v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `youtube.com/watch?v=${ID}`,
    ]) {
      expect(parsearVideoreel(enlace), enlace).toEqual({ plataforma: "youtube", id: ID });
    }
  });
  it("YouTube con un id que no es de 11 caracteres no sirve", () => {
    expect(parsearVideoreel("https://youtu.be/corto")).toBeNull();
    expect(parsearVideoreel("https://www.youtube.com/@canal")).toBeNull();
  });
  it("Vimeo, con y sin hash de video no listado", () => {
    expect(parsearVideoreel("https://vimeo.com/123456")).toEqual({ plataforma: "vimeo", id: "123456" });
    expect(parsearVideoreel("https://vimeo.com/123456/abcdef")).toEqual({
      plataforma: "vimeo",
      id: "123456",
      hash: "abcdef",
    });
    expect(parsearVideoreel("https://player.vimeo.com/video/123456?h=abcdef")).toEqual({
      plataforma: "vimeo",
      id: "123456",
      hash: "abcdef",
    });
    expect(parsearVideoreel("https://vimeo.com/channels/staff/123456")).toEqual({
      plataforma: "vimeo",
      id: "123456",
    });
  });
  it("rechaza otras plataformas y texto vacío", () => {
    expect(parsearVideoreel("https://instagram.com/reel/abc")).toBeNull();
    expect(parsearVideoreel("   ")).toBeNull();
    expect(esVideoreelValido("no es un enlace")).toBe(false);
  });
});

describe("urlEmbedVideoreel", () => {
  it("arma la URL del reproductor", () => {
    expect(urlEmbedVideoreel({ plataforma: "youtube", id: ID })).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(urlEmbedVideoreel({ plataforma: "vimeo", id: "123456" })).toBe("https://player.vimeo.com/video/123456");
    expect(urlEmbedVideoreel({ plataforma: "vimeo", id: "123456", hash: "abc" })).toBe(
      "https://player.vimeo.com/video/123456?h=abc",
    );
  });
});
