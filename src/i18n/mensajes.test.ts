import { describe, expect, it } from "vitest";
import { AREAS } from "./request";
import es from "@/mensajes/es.json";
import en from "@/mensajes/en.json";

/** Todas las claves de un objeto de mensajes, con su ruta (`perfil.formulario.nombre`). */
function claves(o: object, prefijo = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`],
  );
}

async function area(idioma: "es" | "en", nombre: string) {
  return (await import(`@/mensajes/${idioma}/${nombre}.json`)).default as object;
}

describe("mensajes (#354)", () => {
  it("los generales tienen las mismas claves en castellano y en inglés", () => {
    expect(claves(en).sort()).toEqual(claves(es).sort());
  });

  for (const nombre of AREAS) {
    it(`${nombre}: mismas claves en los dos idiomas, todas bajo su namespace`, async () => {
      const [enArea, esArea] = await Promise.all([area("en", nombre), area("es", nombre)]);
      expect(claves(enArea).sort()).toEqual(claves(esArea).sort());
      expect(Object.keys(esArea)).toEqual([nombre]);
    });
  }

  it("ningún texto quedó vacío", async () => {
    for (const idioma of ["es", "en"] as const) {
      const todos = [idioma === "es" ? es : en, ...(await Promise.all(AREAS.map((a) => area(idioma, a))))];
      const vacios = todos.flatMap((m) => claves(m).filter((c) => valor(m, c) === ""));
      expect(vacios, idioma).toEqual([]);
    }
  });
});

function valor(o: object, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown>)?.[k], o);
}
