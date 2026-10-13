import { describe, expect, it } from "vitest";
import {
  elegirBorrador,
  erroresDelPaso,
  primerPasoConError,
  reordenarConPrincipal,
  validarPerfil,
  type FotoTalento,
  type ValoresPerfil,
} from "./perfil-talento";

const t = (clave: string) => clave;
const opciones = { esAlta: true, cantidadFotos: 1, validarCreador: true, exigirDisciplina: false, tError: t, tEtiquetas: t, tCreador: t };

const completo: ValoresPerfil = {
  nombre: "Ana Pérez",
  fechaNacimiento: "01/01/1990",
  edadVisible: true,
  ubicacion: { texto: "Palermo, CABA", publica: "Palermo", placeId: null, lat: -34.58, lng: -58.42, pais: "AR" },
  genero: "mujer",
  generoDescripcion: "",
  videoreelUrl: "",
  experiencia: "",
  formacion: "",
  habilidades: [],
  redes: {},
  apareceEnBuscador: true,
  disciplinas: [],
  otroDetalle: "",
};

describe("perfil de talento (#392, compartido web y app)", () => {
  it("un perfil completo no tiene errores", () => {
    expect(validarPerfil(completo, opciones)).toEqual({});
  });

  it("en el alta pide al menos una foto; al editar no", () => {
    expect(validarPerfil(completo, { ...opciones, cantidadFotos: 0 })).toHaveProperty("fotos");
    expect(validarPerfil(completo, { ...opciones, esAlta: false, cantidadFotos: 0 })).not.toHaveProperty("fotos");
  });

  it("menores de 16 y fechas mal escritas no pasan", () => {
    const año = new Date().getFullYear() - 10;
    expect(validarPerfil({ ...completo, fechaNacimiento: `01/01/${año}` }, opciones).fecha_nacimiento).toBe("fechaEdad");
    expect(validarPerfil({ ...completo, fechaNacimiento: "31/02/1990" }, opciones).fecha_nacimiento).toBe("fechaFormato");
  });

  it("«Otro» como disciplina pide el detalle", () => {
    const e = validarPerfil({ ...completo, disciplinas: ["otro"] }, opciones);
    expect(e).toHaveProperty("creador_otro_detalle");
    expect(primerPasoConError(e)).toBe(5);
  });

  it("reparte los errores por paso", () => {
    const e = { nombre: "x", fotos: "y", redes_instagram: "z" };
    expect(erroresDelPaso(e, 1)).toEqual({ nombre: "x" });
    expect(erroresDelPaso(e, 4)).toEqual({ redes_instagram: "z" });
    expect(primerPasoConError(e)).toBe(1);
  });

  it("del borrador se queda con el más nuevo y descarta lo que no tiene forma", () => {
    const local = { nombre: "Local", guardadoEn: 1000, fotos: [{ id: "a", storage_path: "otro/foto.jpg", orden: 0, url: "u", enBd: false }] };
    const enBase = { paso: 3, datos: { nombre: "Base", ubicacion: { texto: 1 } }, actualizadoEn: new Date(5000).toISOString() };
    const r = elegirBorrador("yo", local, enBase)!;
    expect(r.valores.nombre).toBe("Base");
    expect(r.valores.paso).toBe(3);
    expect(r.valores.ubicacion).toBeUndefined();
    // Las fotos de otra cuenta no se aceptan.
    expect(elegirBorrador("yo", { ...local, guardadoEn: 9000 }, enBase)!.valores.fotos).toBeUndefined();
  });

  it("la foto principal pasa primera y el orden queda corrido", () => {
    const f = (id: string, orden: number): FotoTalento => ({ id, orden, storage_path: id, url: id, enBd: true });
    const r = reordenarConPrincipal([f("a", 0), f("b", 3), f("c", 7)], f("c", 7));
    expect(r.map((x) => [x.id, x.orden])).toEqual([["c", 0], ["a", 1], ["b", 2]]);
  });
});
