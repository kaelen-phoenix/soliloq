// La ubicación ya no es una lista cerrada: se elige con autocompletado y se guarda con
// coordenadas (ver `src/lib/ubicacion.ts`). El filtro del feed compara distancias, no textos.

export type Genero = "mujer" | "varon" | "no_binarie" | "otro" | "sin_especificar";

// El enum es lo único que participa del match. La autodescripción libre del perfil no se
// filtra nunca.
export const GENEROS: { valor: Genero; etiqueta: string }[] = [
  { valor: "mujer", etiqueta: "Mujer" },
  { valor: "varon", etiqueta: "Varón" },
  { valor: "no_binarie", etiqueta: "No binarie" },
  { valor: "otro", etiqueta: "Otro" },
  { valor: "sin_especificar", etiqueta: "Prefiero no decirlo" },
];

// Buscar gente que no declaró su género no es un criterio de casting, así que
// `sin_especificar` no se ofrece como género buscable en un rol.
export const GENEROS_BUSCABLES = GENEROS.filter((g) => g.valor !== "sin_especificar");

export const MAX_GENERO_DESCRIPCION = 60;

export function etiquetaGenero(valor: Genero): string {
  return GENEROS.find((g) => g.valor === valor)?.etiqueta ?? "";
}

export const HABILIDADES = [
  "Canto",
  "Danza",
  "Acrobacia",
  "Instrumentos musicales",
  "Idiomas",
  "Doblaje / locución",
  "Esgrima escénica",
  "Improvisación",
] as const;

export function calcularEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) edad -= 1;
  return edad;
}
