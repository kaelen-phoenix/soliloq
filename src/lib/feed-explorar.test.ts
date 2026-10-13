import { describe, expect, it } from "vitest";
import { aFilaConvocatoria, claveErrorResponder } from "./convocatoria-talento";
import { claveErrorDeshacer, claveErrorInteres } from "./feed-errores";
import { aEquipoFeed } from "./feed-roles";

const url = (p: string) => `https://cdn/${p}`;

describe("Explorar y convocatorias (#393, compartido web y app)", () => {
  it("el límite diario de «Me interesa» tiene su propio aviso", () => {
    expect(claveErrorInteres("limite_me_interesa: 20 en 24 h")).toBe("limiteMeInteresa");
    expect(claveErrorInteres("otra cosa")).toBe("errorDecision");
    expect(claveErrorInteres(undefined)).toBe("errorDecision");
  });

  it("deshacer con match no se puede", () => {
    expect(claveErrorDeshacer("ya hay match")).toBe("deshacerConMatch");
    expect(claveErrorDeshacer("timeout")).toBe("errorDeshacer");
  });

  it("una convocatoria que ya no está se avisa distinto", () => {
    expect(claveErrorResponder("convocatoria no encontrada")).toBe("noDisponible");
    expect(claveErrorResponder("boom")).toBe("noSePudo");
  });

  it("resuelve las fotos a URL pública y deja null las que faltan", () => {
    const f = aFilaConvocatoria(
      {
        convocatoria_id: "c",
        creado_en: "",
        creador_nombre: "Ana",
        es_equipo: true,
        iniciativa_foto: "x.jpg",
        iniciativa_titulo: "Obra",
        talento_foto: null as unknown as string,
      },
      url,
    );
    expect(f).toEqual({
      convocatoriaId: "c",
      esEquipo: true,
      iniciativaTitulo: "Obra",
      creadorNombre: "Ana",
      talentoFotoUrl: null,
      iniciativaFotoUrl: "https://cdn/x.jpg",
    });
  });

  it("arma la tarjeta de equipo con las fotos resueltas", () => {
    const e = aEquipoFeed(
      { equipo_id: "e", titulo: "T", cupo: 3, creador_id: "u", creador_nombre: "Beto", creador_foto_path: "", creado_en: "", fotos: ["a.jpg"] },
      url,
    );
    expect(e.creador_imagen_url).toBeNull();
    expect(e.fotos).toEqual(["https://cdn/a.jpg"]);
  });
});
