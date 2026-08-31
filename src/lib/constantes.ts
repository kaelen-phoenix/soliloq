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

/**
 * A qué familia de oficio pertenece cada disciplina.
 *
 * El agrupamiento no es estético: son diecisiete disciplinas y ninguna paleta categórica
 * distingue diecisiete colores. Cuatro familias sí se distinguen, y de paso dicen algo que
 * la lista plana no decía — que iluminación y sonido son parientes, y que dirigir y escribir
 * están más cerca entre sí que de actuar.
 *
 * `otro` queda deliberadamente sin color: es la disciplina que no entra en ninguna familia,
 * y pintarla obligaría a inventarle una.
 */
export type FamiliaOficio = "escena" | "direccion" | "diseno" | "tecnica" | "otro";

const FAMILIA_POR_DISCIPLINA: Record<DisciplinaArtistica, FamiliaOficio> = {
  actuacion: "escena",
  danza: "escena",
  musica: "escena",
  coreografia: "escena",

  direccion: "direccion",
  dramaturgia: "direccion",
  guion: "direccion",
  asistencia_direccion: "direccion",
  produccion: "direccion",

  vestuario: "diseno",
  escenografia: "diseno",
  maquillaje: "diseno",

  iluminacion: "tecnica",
  sonido: "tecnica",
  fotografia: "tecnica",
  edicion: "tecnica",

  otro: "otro",
};

/** Clases de la etiqueta. Van completas y no armadas por interpolación: Tailwind lee el
 *  código fuente para decidir qué CSS genera, y un nombre construido en runtime no existe
 *  para él — la clase simplemente no se emite. */
const CLASES_FAMILIA: Record<FamiliaOficio, string> = {
  escena: "bg-escena-50 text-escena-600",
  direccion: "bg-direccion-50 text-direccion-600",
  diseno: "bg-diseno-50 text-diseno-600",
  tecnica: "bg-tecnica-50 text-tecnica-600",
  otro: "bg-ink-100 text-ink-600",
};

export function familiaDeDisciplina(valor: DisciplinaArtistica): FamiliaOficio {
  return FAMILIA_POR_DISCIPLINA[valor] ?? "otro";
}

export function clasesDisciplina(valor: DisciplinaArtistica): string {
  return CLASES_FAMILIA[familiaDeDisciplina(valor)];
}

export function etiquetaDisciplina(valor: DisciplinaArtistica): string {
  return DISCIPLINAS.find((d) => d.valor === valor)?.etiqueta ?? "";
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

// Redes sociales del perfil de talento. El conjunto es chico y estable, así que vive acá
// como lista cerrada (igual que `GENEROS` o `DISCIPLINAS`). La lógica de normalizar un
// `@handle` o una URL a la forma canónica está en `src/lib/redes.ts`, no acá: esto es solo
// el dato.
//
// `hosts`: dominios que se aceptan como "de esta red" al pegar una URL. El primero es el
// canónico (el que queda guardado). `prefijoCanonico`: a qué URL se antepone un `@usuario`.
// `conservarQuery`: si al canonizar una URL hay que preservar el query string (YouTube lo
// necesita para `/watch?v=`).
export type ClaveRed = "instagram" | "youtube" | "tiktok" | "x" | "linkedin" | "vimeo" | "sitio";

export interface Red {
  clave: ClaveRed;
  etiqueta: string;
  hosts: string[];
  prefijoCanonico: string;
  icono: "instagram" | "youtube" | "tiktok" | "x" | "linkedin" | "vimeo" | "sitio";
  conservarQuery?: boolean;
}

export const REDES: Red[] = [
  {
    clave: "instagram",
    etiqueta: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"],
    prefijoCanonico: "https://instagram.com/",
    icono: "instagram",
  },
  {
    clave: "youtube",
    etiqueta: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com"],
    prefijoCanonico: "https://youtube.com/@",
    icono: "youtube",
    conservarQuery: true,
  },
  {
    clave: "tiktok",
    etiqueta: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com"],
    prefijoCanonico: "https://tiktok.com/@",
    icono: "tiktok",
  },
  {
    clave: "x",
    etiqueta: "X",
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
    prefijoCanonico: "https://x.com/",
    icono: "x",
  },
  {
    clave: "linkedin",
    etiqueta: "LinkedIn",
    hosts: ["linkedin.com", "www.linkedin.com"],
    prefijoCanonico: "https://linkedin.com/in/",
    icono: "linkedin",
  },
  {
    clave: "vimeo",
    etiqueta: "Vimeo",
    hosts: ["vimeo.com", "www.vimeo.com"],
    prefijoCanonico: "https://vimeo.com/",
    icono: "vimeo",
  },
  {
    clave: "sitio",
    etiqueta: "Sitio web",
    hosts: [],
    prefijoCanonico: "",
    icono: "sitio",
  },
];

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
