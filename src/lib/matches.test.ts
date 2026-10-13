import { describe, expect, it } from "vitest";
import {
  armarConvocatorias,
  errorConocidoConvocar,
  errorConocidoDescartar,
  errorConocidoDesvincularSala,
  errorConocidoRetirarme,
  filtrosAvanzadosActivos,
  hayFiltrosTalento,
  matchDeLaIniciativa,
  parametrosBuscarTalento,
  pestanaInicial,
  rolesDeCobertura,
  vencimiento,
  type FiltrosTalento,
} from "./matches";

const sinFiltros: FiltrosTalento = {
  texto: "",
  edadMin: "",
  edadMax: "",
  generos: [],
  habilidades: [],
  ubicacion: null,
  radioMetros: 50_000,
};

const matchBase = {
  cupo_lleno: false,
  es_equipo: false,
  expira_en: "2026-10-20T00:00:00Z",
  foto_path: "f.jpg",
  iniciativa_foto: "i.jpg",
  iniciativa_titulo: "Hamlet",
  match_id: "m1",
  mostrado_en: null as unknown as string,
  nombre: "Ana",
  obra_id: "o1",
  talento_id: "t1",
};

describe("convocatorias y buscar talento (#393, compartido web y app)", () => {
  it("traduce los errores conocidos de la base y deja pasar los demás", () => {
    expect(errorConocidoConvocar("ERROR: rol_lleno")).toBe("rolLleno");
    expect(errorConocidoConvocar("cupo_lleno")).toBe("cupoLleno");
    expect(errorConocidoConvocar("otra cosa")).toBeNull();
    expect(errorConocidoDescartar("ya aceptó la convocatoria")).toBe("yaAcepto");
    expect(errorConocidoRetirarme("ya estás en el chat")).toBe("yaEnChat");
    expect(errorConocidoDesvincularSala("el dueño no puede")).toBe("errorDueno");
    expect(errorConocidoConvocar(undefined)).toBeNull();
  });

  it("un rol queda cubierto cuando tiene tantos convocados como vacantes", () => {
    const fila = (rol: string, talento: string | null, vacantes: number) => ({
      convocatoria_id: "c",
      rol_id: rol,
      rol_nombre: `Rol ${rol}`,
      talento_foto: "",
      talento_id: talento as string,
      talento_nombre: "",
      vacantes,
    });
    const roles = rolesDeCobertura([fila("a", "t1", 1), fila("b", "t2", 2), fila("b", null, 2)]);
    expect(roles).toEqual([
      { id: "a", nombre: "Rol a", disponible: false },
      { id: "b", nombre: "Rol b", disponible: true },
    ]);
  });

  it("arma las filas de las dos pestañas y los avisos pendientes", () => {
    const url = (p: string | null) => (p ? `https://x/${p}` : null);
    const r = armarConvocatorias([matchBase], [], [], url);
    expect(r.filasCreador).toHaveLength(1);
    expect(r.filasCreador[0]).toMatchObject({ estado: "en_convocados", fotoUrl: "https://x/f.jpg", obraId: "o1" });
    expect(r.nuevos.map((n) => n.matchId)).toEqual(["m1"]);
    expect(armarConvocatorias([{ ...matchBase, mostrado_en: "2026-10-01" }], [], [], url).nuevos).toHaveLength(0);
  });

  it("arranca en la pestaña que tiene algo", () => {
    expect(pestanaInicial(2, 0, true)).toBe("proyectos");
    expect(pestanaInicial(0, 1, true)).toBe("talento");
    expect(pestanaInicial(0, 0, false)).toBe("talento");
    expect(pestanaInicial(0, 0, true)).toBe("proyectos");
  });

  it("cuenta los días que le quedan a un match", () => {
    const ahora = Date.parse("2026-10-13T12:00:00Z");
    expect(vencimiento("2026-10-13T10:00:00Z", ahora).clave).toBe("venceHoy");
    expect(vencimiento("2026-10-14T10:00:00Z", ahora).clave).toBe("venceManana");
    expect(vencimiento("2026-10-17T10:00:00Z", ahora)).toEqual({ clave: "venceEn", dias: 4 });
  });

  it("busca para la iniciativa y solo filtra por zona con radio", () => {
    const iniciativa = { tipo: "equipo" as const, id: "e1", titulo: "Banda" };
    const p = parametrosBuscarTalento({ ...sinFiltros, texto: "  canto ", edadMin: "20" }, iniciativa, 24);
    expect(p).toMatchObject({ p_texto: "canto", p_edad_min: 20, p_equipo_id: "e1", p_obra_id: null, p_offset: 24, p_lat: null });
    const ubicacion = { texto: "x", publica: "x", placeId: null, lat: 1, lng: 2, pais: "AR" };
    expect(parametrosBuscarTalento({ ...sinFiltros, ubicacion }, null, 0)).toMatchObject({ p_lat: 1, p_lng: 2, p_radio_metros: 50_000 });
    expect(parametrosBuscarTalento({ ...sinFiltros, ubicacion, radioMetros: null }, null, 0).p_lat).toBeNull();
  });

  it("cuenta los filtros avanzados", () => {
    expect(hayFiltrosTalento(sinFiltros)).toBe(false);
    expect(filtrosAvanzadosActivos({ ...sinFiltros, edadMax: "40", generos: ["mujer"] })).toBe(2);
    expect(hayFiltrosTalento({ ...sinFiltros, texto: "x" })).toBe(true);
  });

  it("encuentra el match de esta iniciativa y no el de otra", () => {
    const otra = { ...matchBase, match_id: "m0", iniciativa_titulo: "Otra" };
    expect(matchDeLaIniciativa([otra, matchBase], "t1", { tipo: "obra", id: "o1", titulo: "Hamlet" })).toBe("m1");
    expect(matchDeLaIniciativa([otra], "t1", { tipo: "obra", id: "o1", titulo: "Hamlet" })).toBeNull();
  });
});
