// La ubicación ya no es una lista cerrada: se elige con autocompletado y se guarda con
// coordenadas (ver `src/lib/ubicacion.ts`). El filtro del feed compara distancias, no textos.

import type { DisciplinaArtistica } from "@/lib/supabase/types";

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

// Perfil artístico: qué hace la persona en el medio. Reemplazó al par director/compañía.
// El orden es el del documento de producto, no alfabético: arranca por lo más frecuente.
export const DISCIPLINAS: { valor: DisciplinaArtistica; etiqueta: string }[] = [
  { valor: "actuacion", etiqueta: "Actuación" },
  { valor: "direccion", etiqueta: "Dirección" },
  { valor: "guion", etiqueta: "Guion" },
  { valor: "produccion", etiqueta: "Producción" },
  { valor: "dramaturgia", etiqueta: "Dramaturgia" },
  { valor: "vestuario", etiqueta: "Vestuario" },
  { valor: "escenografia", etiqueta: "Escenografía" },
  { valor: "iluminacion", etiqueta: "Iluminación" },
  { valor: "sonido", etiqueta: "Sonido" },
  { valor: "coreografia", etiqueta: "Coreografía" },
  { valor: "danza", etiqueta: "Danza" },
  { valor: "musica", etiqueta: "Música" },
  { valor: "fotografia", etiqueta: "Fotografía" },
  { valor: "edicion", etiqueta: "Edición" },
  { valor: "maquillaje", etiqueta: "Maquillaje" },
  { valor: "asistencia_direccion", etiqueta: "Asistencia de dirección" },
  { valor: "otro", etiqueta: "Otro" },
];

export const MAX_OTRO_DETALLE = 80;

export function etiquetaDisciplina(valor: DisciplinaArtistica): string {
  return DISCIPLINAS.find((d) => d.valor === valor)?.etiqueta ?? "";
}

/**
 * Cómo se presenta el perfil artístico en una línea. `otro` se reemplaza por lo que la
 * persona escribió: mostrar la palabra "Otro" en un perfil público no le dice nada a nadie.
 */
export function resumenDisciplinas(
  disciplinas: DisciplinaArtistica[],
  otroDetalle?: string | null
): string {
  if (disciplinas.length === 0) return "Perfil artístico sin completar";
  return disciplinas
    .map((d) => (d === "otro" && otroDetalle ? otroDetalle : etiquetaDisciplina(d)))
    .join(" · ");
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
