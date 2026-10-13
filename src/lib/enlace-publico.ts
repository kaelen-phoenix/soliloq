/**
 * El enlace público del perfil (#384): lo usan la web (`boton-compartir.tsx`) y la app nativa.
 */

/** Formato del nombre del enlace (0113): minúsculas, números y guiones, de 3 a 40. */
export const FORMATO_ALIAS = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function aliasValido(valor: string): boolean {
  return FORMATO_ALIAS.test(valor) && valor.length >= 3 && valor.length <= 40;
}

/** «Ana Pérez» → «ana-perez»: una sugerencia para el nombre del enlace. */
export function aAlias(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Error de la base al guardar el nombre → clave del texto (`perfil.compartir`). */
export function errorAlias(codigo: string | undefined): "aliasOcupado" | "aliasFormato" | "aliasError" {
  // 23505: lo usa otra persona; 23514: no cumple el formato (lo valida la base, 0113).
  return codigo === "23505" ? "aliasOcupado" : codigo === "23514" ? "aliasFormato" : "aliasError";
}

/** Visitas del enlace (`visitas_enlace`): últimos 30 días y en total. */
export function resumirVisitas(filas: { dia: string; cantidad: number }[] | null, hoy = new Date()) {
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    ultimos30: (filas ?? []).filter((v) => v.dia >= hace30).reduce((n, v) => n + v.cantidad, 0),
    total: (filas ?? []).reduce((n, v) => n + v.cantidad, 0),
  };
}
