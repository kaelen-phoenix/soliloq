import { describe, expect, it } from "vitest";
import {
  claveErrorDesvincular,
  claveRolEnSala,
  contarNoLeidos,
  nombresDeLosOtros,
  ordenarSalas,
  primerNombre,
  textoBadge,
} from "./salas-reglas";
import { destinoNotificacion } from "./notificaciones-reglas";

describe("chats (#394, compartido web y app)", () => {
  it("destacados primero (el último arriba), después por actividad", () => {
    const s = (id: string, destacadoEn: string | null, ultimaActividad: string | null) => ({ id, destacadoEn, ultimaActividad });
    const r = ordenarSalas([s("a", null, "2026-01-03"), s("b", "2026-01-01", null), s("c", null, "2026-01-05"), s("d", "2026-01-02", null)]);
    expect(r.map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("la sala abierta no cuenta para el badge", () => {
    const f = (sala_id: string, no_leidos: number) => ({ sala_id, no_leidos, es_de_iniciativa: true, es_dueno: false });
    const r = contarNoLeidos([f("a", 2), f("b", 3), f("c", 0)], "b");
    expect([...r.porSala.entries()]).toEqual([["a", 2]]);
    expect(r.total).toBe(2);
    expect(textoBadge(12)).toBe("9+");
    expect(textoBadge(3)).toBe("3");
  });

  it("en un chat directo el título es el nombre de los otros", () => {
    const r = nombresDeLosOtros(
      ["s1", "s2"],
      [{ sala_id: "s1", perfil_id: "p1" }, { sala_id: "s1", perfil_id: "p2" }],
      [{ id: "p1", nombre: "Ana" }],
      { sinCompletar: "Perfil sin completar", separador: " y " },
    );
    expect(r.get("s1")).toBe("Ana y Perfil sin completar");
    expect(r.has("s2")).toBe(false);
  });

  it("textos chicos", () => {
    expect(primerNombre("  Ana María Pérez ")).toBe("Ana");
    expect(claveErrorDesvincular("el dueño no puede")).toBe("errorDueno");
    expect(claveErrorDesvincular("otra cosa")).toBe("errorGenerico");
    expect(claveRolEnSala(true, true)).toBe("director");
    expect(claveRolEnSala(false, true)).toBe("elenco");
    expect(claveRolEnSala(false, false)).toBe("contacto");
  });

  it("a dónde lleva cada notificación", () => {
    expect(destinoNotificacion({ tipo: "sala_creada", sala_id: "s", obra_id: null })).toBe("/salas/s");
    expect(destinoNotificacion({ tipo: "convocado", sala_id: null, obra_id: null })).toBe("/convocatoria");
    expect(destinoNotificacion({ tipo: "match", sala_id: null, obra_id: "o" })).toBe("/obras/o");
    expect(destinoNotificacion({ tipo: "interes_recibido", sala_id: null, obra_id: null })).toBeNull();
  });
});
