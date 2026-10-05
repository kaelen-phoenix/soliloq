import { describe, expect, it } from "vitest";
import { destinoSegunEstado, resolverEstadoCuenta } from "./cuenta";

const AHORA = "2026-10-05T00:00:00Z";
const completo = { aprobado_en: AHORA, normas_aceptadas_en: AHORA, tour_talento_visto_en: AHORA };

describe("resolverEstadoCuenta", () => {
  it("lee las marcas de la fila de perfil", () => {
    const e = resolverEstadoCuenta({ ...completo, es_admin: true, suspendido_en: AHORA }, true, true);
    expect(e).toMatchObject({
      aprobado: true,
      normasAceptadas: true,
      tourVisto: true,
      esAdmin: true,
      suspendido: true,
      tieneAmbosPerfiles: true,
    });
  });
  it("sin fila de perfil: nada aprobado y el tour se da por visto", () => {
    const e = resolverEstadoCuenta(null, false, false);
    expect(e.aprobado).toBe(false);
    expect(e.esAdmin).toBe(false);
    expect(e.tourVisto).toBe(true);
  });
});

describe("destinoSegunEstado", () => {
  const estado = (fila: Parameters<typeof resolverEstadoCuenta>[0], talento: boolean) =>
    destinoSegunEstado(resolverEstadoCuenta(fila, talento, false));

  it("va en orden: aprobación → normas → perfil → app", () => {
    expect(estado({}, false)).toBe("solicitud-pendiente");
    expect(estado({ aprobado_en: AHORA }, false)).toBe("aceptar-normas");
    expect(estado({ aprobado_en: AHORA, normas_aceptadas_en: AHORA }, false)).toBe("completar-perfil");
    expect(estado(completo, true)).toBe("app");
  });
  it("la aprobación va antes que las normas aunque ya las haya aceptado", () => {
    expect(estado({ normas_aceptadas_en: AHORA }, true)).toBe("solicitud-pendiente");
  });
  it("ser Creador no reemplaza al Perfil de Talento", () => {
    const e = resolverEstadoCuenta({ aprobado_en: AHORA, normas_aceptadas_en: AHORA }, false, true);
    expect(destinoSegunEstado(e)).toBe("completar-perfil");
  });
});
