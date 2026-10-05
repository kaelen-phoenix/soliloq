// La ubicación ya no es una lista cerrada: se elige con autocompletado y se guarda con
// coordenadas (ver `src/lib/ubicacion.ts`). El filtro del feed compara distancias, no textos.

import type { DisciplinaArtistica } from "@/lib/supabase/types";
import mensajesPerfilEs from "@/mensajes/es/perfil.json";

// --- Etiquetas traducibles (#354) -------------------------------------------------------
//
// Los textos de esta lista (y los de `ubicacion.ts`, `redes.ts`, `comprimir-imagen.ts` y
// `onboarding-ejemplo.ts`) viven en `mensajes/<idioma>/perfil.json`, bajo `perfil.etiquetas`.
// Desde un componente se traducen con un traductor parado en ese namespace:
//
//   const t = useTranslations("perfil.etiquetas");   // o getTranslations(...) en el servidor
//   t(claveGenero(valor))  ·  etiquetaHabilidad(h, t)  ·  opcionesDeRadio(unidad, t)
//
// Sin traductor, las funciones devuelven el castellano, leído del mismo JSON: así quien
// todavía no pasa `t` sigue viendo lo de siempre.

/** Lo que devuelve `useTranslations("perfil.etiquetas")`, reducido a lo que se usa acá. */
export type TraductorEtiquetas = (clave: string, valores?: Record<string, string | number>) => string;

/** El castellano de `perfil.etiquetas`, sin depender de next-intl (sirve fuera de React). */
export const traductorCastellano: TraductorEtiquetas = (clave, valores) => {
  let nodo: unknown = mensajesPerfilEs.perfil.etiquetas;
  for (const parte of clave.split(".")) {
    nodo = nodo && typeof nodo === "object" ? (nodo as Record<string, unknown>)[parte] : undefined;
  }
  if (typeof nodo !== "string") return clave;
  return nodo.replace(/\{(\w+)\}/g, (_, v: string) => String(valores?.[v] ?? `{${v}}`));
};

export type Genero = "mujer" | "varon" | "no_binarie" | "otro" | "sin_especificar";

// El enum es lo único que participa del match. La autodescripción libre del perfil no se
// filtra nunca.
// `etiqueta` es el castellano; para el idioma activo, `t(claveGenero(g.valor))`.
const VALORES_GENERO: Genero[] = ["mujer", "varon", "no_binarie", "otro", "sin_especificar"];

/** Clave de la etiqueta dentro de `perfil.etiquetas`. */
export function claveGenero(valor: Genero): string {
  return `genero.${valor}`;
}

export const GENEROS: { valor: Genero; etiqueta: string }[] = VALORES_GENERO.map((valor) => ({
  valor,
  etiqueta: traductorCastellano(claveGenero(valor)),
}));

// Buscar gente que no declaró su género no es un criterio de casting, así que
// `sin_especificar` no se ofrece como género buscable en un rol.
export const GENEROS_BUSCABLES = GENEROS.filter((g) => g.valor !== "sin_especificar");

export const MAX_GENERO_DESCRIPCION = 60;

/** En castellano. Para el idioma activo: `t(claveGenero(valor))`. */
export function etiquetaGenero(valor: Genero): string {
  return GENEROS.find((g) => g.valor === valor)?.etiqueta ?? "";
}

// Perfil artístico: qué hace la persona en el medio. Reemplazó al par director/compañía.
// El orden es el del documento de producto, no alfabético: arranca por lo más frecuente.
const VALORES_DISCIPLINA: DisciplinaArtistica[] = [
  "actuacion",
  "direccion",
  "guion",
  "produccion",
  "dramaturgia",
  "vestuario",
  "escenografia",
  "iluminacion",
  "sonido",
  "coreografia",
  "danza",
  "musica",
  "fotografia",
  "edicion",
  "maquillaje",
  "asistencia_direccion",
  "otro",
];

/** Clave de la etiqueta dentro de `perfil.etiquetas`. */
export function claveDisciplina(valor: DisciplinaArtistica): string {
  return `disciplina.${valor}`;
}

// `etiqueta` es el castellano; para el idioma activo, `t(claveDisciplina(d.valor))`.
export const DISCIPLINAS: { valor: DisciplinaArtistica; etiqueta: string }[] = VALORES_DISCIPLINA.map(
  (valor) => ({ valor, etiqueta: traductorCastellano(claveDisciplina(valor)) }),
);

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

/** En castellano. Para el idioma activo: `t(claveDisciplina(valor))`. */
export function etiquetaDisciplina(valor: DisciplinaArtistica): string {
  return DISCIPLINAS.find((d) => d.valor === valor)?.etiqueta ?? "";
}

// Se guardan en la base tal cual (en castellano): son el valor, no la etiqueta. Por eso no
// salen del JSON — cambiarlas ahí no puede cambiar lo que ya está guardado.
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

const CLAVE_HABILIDAD: Record<(typeof HABILIDADES)[number], string> = {
  Canto: "canto",
  Danza: "danza",
  Acrobacia: "acrobacia",
  "Instrumentos musicales": "instrumentos",
  Idiomas: "idiomas",
  "Doblaje / locución": "doblaje",
  "Esgrima escénica": "esgrima",
  Improvisación: "improvisacion",
};

/**
 * La habilidad guardada, en el idioma de `t`. Una que no está en la lista (de antes, o
 * escrita a mano) se muestra tal cual se guardó.
 */
export function etiquetaHabilidad(habilidad: string, t: TraductorEtiquetas = traductorCastellano): string {
  const clave = CLAVE_HABILIDAD[habilidad as (typeof HABILIDADES)[number]];
  return clave ? t(`habilidad.${clave}`) : habilidad;
}

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
  /** En castellano. Para el idioma activo: `t(claveRed(red.clave))`. */
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
    etiqueta: traductorCastellano("red.sitio"),
    hosts: [],
    prefijoCanonico: "",
    icono: "sitio",
  },
];

/** Clave del nombre de la red dentro de `perfil.etiquetas` (solo «Sitio web» cambia). */
export function claveRed(clave: ClaveRed): string {
  return `red.${clave}`;
}

/**
 * Las columnas de `perfiles_talento` que puede leer cualquiera que vea el perfil (#255).
 * `fecha_nacimiento`, `ubicacion_texto`, `ubicacion_place_id` y las coordenadas no: la base
 * las niega a las sesiones de usuario (0089). Lo propio se lee con `mi_perfil_talento()` y
 * la edad ajena con `edad_publica()`.
 */
export const COLUMNAS_PUBLICAS_TALENTO =
  "id, nombre, edad_visible, ubicacion_publica, ubicacion_pais, genero, genero_descripcion, videoreel_url, experiencia, habilidades, redes, aparece_en_buscador";

export function calcularEdad(fechaNacimiento: string): number {
  // Se lee «aaaa-mm-dd» por partes: `new Date("1990-10-06")` es medianoche UTC, que al oeste
  // de Greenwich (Argentina) cae el día anterior y sumaba el año un día antes (#355).
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const aunNoCumplio =
    hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia);
  if (aunNoCumplio) edad -= 1;
  return edad;
}
