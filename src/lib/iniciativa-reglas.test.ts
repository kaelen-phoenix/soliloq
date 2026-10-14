import { describe, expect, it } from "vitest";
import {
  agruparCobertura,
  columnasObra,
  columnasRol,
  filasRolesNuevos,
  itemsTablero,
  problemaParaPublicar,
  resumirMetricas,
  rutaFotoIniciativa,
  validarEquipo,
  validarObra,
  validarRol,
  type ValoresRol,
} from "./iniciativa-reglas";

const ubicacion = { texto: "Palermo, CABA", publica: "Palermo", placeId: null, lat: -34.58, lng: -58.42, pais: "AR" };
const claves = { titulo: "errorTitulo", ubicacion: "errorUbicacion" };
const rol: ValoresRol = {
  nombre: "Actriz",
  tipo: "actuacion",
  edadMinima: "",
  edadMaxima: "",
  vacantes: "1",
  descripcion: "",
  generos: [],
};

describe("reglas de Proyectos y Equipos (#393, compartidas web y app)", () => {
  it("el Proyecto pide título y locación", () => {
    expect(validarObra({ titulo: " ", ubicacion: null }, claves)).toEqual({
      titulo: "errorTitulo",
      ubicacion: "errorUbicacion",
    });
    expect(validarObra({ titulo: "Hamlet", ubicacion }, claves)).toEqual({});
  });

  it("guarda el Proyecto con la locación en columnas y lo vacío como null", () => {
    const c = columnasObra({ titulo: " Hamlet ", sinopsis: "  ", ubicacion, fechaEstreno: "" });
    expect(c).toMatchObject({ titulo: "Hamlet", sinopsis: null, fecha_estreno_estimada: null, ubicacion_publica: "Palermo" });
  });

  it("los roles del alta son de actuación, con una vacante", () => {
    expect(filasRolesNuevos("o1", [{ id: "x", nombre: "Director", descripcion: "" }])).toEqual([
      { obra_id: "o1", nombre: "Director", tipo: "actuacion", vacantes: 1, descripcion: null },
    ]);
  });

  it("valida el rol: nombre, edades y vacantes", () => {
    expect(validarRol({ ...rol, nombre: "" })).toBe("errorNombre");
    expect(validarRol({ ...rol, edadMinima: "40", edadMaxima: "30" })).toBe("errorEdades");
    expect(validarRol({ ...rol, vacantes: "0" })).toBe("errorVacantes");
    expect(validarRol({ ...rol, vacantes: "1.5" })).toBe("errorVacantes");
    expect(validarRol(rol)).toBeNull();
    expect(columnasRol("o1", { ...rol, edadMinima: "20" })).toMatchObject({ edad_minima: 20, edad_maxima: null, vacantes: 1 });
  });

  it("publicar pide un rol y una foto", () => {
    expect(problemaParaPublicar(0, 3)).toBe("faltaRol");
    expect(problemaParaPublicar(2, 0)).toBe("faltaFoto");
    expect(problemaParaPublicar(1, 1)).toBeNull();
  });

  it("el Equipo pide título", () => {
    expect(validarEquipo("  ")).toBe("errorTitulo");
    expect(validarEquipo("Escribamos juntos")).toBeNull();
  });

  it("agrupa la cobertura por rol, con sus ocupantes", () => {
    const g = agruparCobertura(
      [
        { rolId: "r1", rolNombre: "Actriz", vacantes: 2, convocatoriaId: "c1", talentoId: "t1", talentoNombre: null, talentoFotoUrl: null },
        { rolId: "r1", rolNombre: "Actriz", vacantes: 2, convocatoriaId: null, talentoId: null, talentoNombre: null, talentoFotoUrl: null },
        { rolId: "r2", rolNombre: "Luces", vacantes: 1, convocatoriaId: null, talentoId: null, talentoNombre: null, talentoFotoUrl: null },
      ],
      "Talento",
    );
    expect(g).toHaveLength(2);
    expect(g[0].ocupantes).toEqual([{ convocatoriaId: "c1", talentoId: "t1", nombre: "Talento", fotoUrl: null }]);
    expect(g[1].ocupantes).toEqual([]);
  });

  it("resume las métricas", () => {
    expect(resumirMetricas(null).estado).toBe("sinRoles");
    expect(resumirMetricas({ alcance: 0, convocados: 0, cupo: 2, interes_recibido: 0, matches: 0 }).estado).toBe("sinAlcance");
    expect(resumirMetricas({ alcance: 8, convocados: 5, cupo: 2, interes_recibido: 2, matches: 1 })).toEqual({
      estado: "ok",
      tasa: 25,
      convocados: 2,
      cupo: 2,
    });
  });

  it("el tablero junta todo, lo más nuevo primero", () => {
    const items = itemsTablero(
      [{ id: "o", titulo: "Obra", estado: "publicada", creado_en: "2026-01-01" }],
      [{ id: "e", titulo: "Equipo", activo: false, creado_en: "2026-02-01" }],
    );
    expect(items.map((i) => [i.id, i.tipo, i.estado])).toEqual([
      ["e", "equipo", "cerrado"],
      ["o", "proyecto", "publicada"],
    ]);
  });

  it("solo lo cerrado se puede quitar; si se reabre, deja de estar oculto (#413)", () => {
    const items = itemsTablero(
      [
        { id: "c", titulo: "Cerrada", estado: "cerrada", creado_en: "2026-01-01", oculta_en: "2026-03-01" },
        { id: "p", titulo: "Publicada", estado: "publicada", creado_en: "2026-01-02", oculta_en: "2026-03-01" },
      ],
      [{ id: "e", titulo: "Equipo", activo: false, creado_en: "2026-02-01", oculta_en: null }],
    );
    const por = Object.fromEntries(items.map((i) => [i.id, [i.cerrada, i.oculta]]));
    expect(por).toEqual({ c: [true, true], p: [false, false], e: [true, false] });
  });

  it("la ruta de la foto arranca con el uid del creador", () => {
    expect(rutaFotoIniciativa("u", "equipo", "e1", "a.jpg")).toBe("u/equipos/e1/a.jpg");
  });
});
