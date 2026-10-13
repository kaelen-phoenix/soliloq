/**
 * Las reglas del Perfil de Talento, compartidas por la web (`formulario-talento.tsx`) y la app
 * nativa (#392): qué se valida, cómo se reparte en los pasos del alta (#383), cómo se lee el
 * borrador y qué se guarda. Sin React ni nada de la web: lo importan las dos.
 */
import { calcularEdad, MAX_GENERO_DESCRIPCION, type Genero, type TraductorEtiquetas } from "@/lib/constantes";
import { textoAIso } from "@/lib/fecha-escrita";
import { validarRedes } from "@/lib/redes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";
import { aColumnas, type Ubicacion } from "@/lib/ubicacion";
import { esVideoreelValido } from "@/lib/videoreel";

// ── Fotos ──────────────────────────────────────────────────────────────────────────────

export interface FotoTalento {
  /** Id de la fila en `fotos_talento`, o un id temporal si todavía no se persistió. */
  id: string;
  storage_path: string;
  orden: number;
  url: string;
  /** false mientras la foto vive solo en Storage, durante el alta del perfil. */
  enBd: boolean;
}

export const MAX_FOTOS = 5;
// #311: con una foto alcanza para empezar; se recomiendan tres.
export const MIN_FOTOS = 1;
export const FOTOS_RECOMENDADAS = 3;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
export const BUCKET_FOTOS = "fotos-perfil";

/** El siguiente `orden` libre (max + 1: no reusa el de una foto borrada del medio). */
export function siguienteOrden(fotos: FotoTalento[]): number {
  return fotos.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
}

/** La elegida primero y el resto detrás, con el orden renumerado de corrido. */
export function reordenarConPrincipal(fotos: FotoTalento[], principal: FotoTalento): FotoTalento[] {
  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);
  return [principal, ...ordenadas.filter((f) => f.id !== principal.id)].map((f, i) => ({ ...f, orden: i }));
}

/**
 * Las filas de `fotos_talento` de las fotos que todavía solo existen en Storage. Se insertan
 * recién después de crear el perfil, porque la FK exige que la fila de `perfiles_talento` ya
 * exista. (Devuelve las filas y no inserta: la web y la app tienen cada una su cliente.)
 */
export function filasFotosPendientes(talentoId: string, fotos: FotoTalento[]) {
  return fotos
    .filter((f) => !f.enBd)
    .map((f) => ({ talento_id: talentoId, storage_path: f.storage_path, orden: f.orden }));
}

// ── Valores del formulario ────────────────────────────────────────────────────────────

export interface ValoresPerfil {
  nombre: string;
  /** Lo que se escribe, «dd/mm/aaaa» (#307). */
  fechaNacimiento: string;
  edadVisible: boolean;
  ubicacion: Ubicacion | null;
  genero: Genero | "";
  generoDescripcion: string;
  videoreelUrl: string;
  experiencia: string;
  formacion: string;
  habilidades: string[];
  redes: Record<string, string>;
  apareceEnBuscador: boolean;
  disciplinas: DisciplinaArtistica[];
  otroDetalle: string;
}

export const MAX_TEXTO_LARGO = 2000;

/** Las reglas del perfil de Creador (`perfiles_creador`). */
export function validarCreador(
  disciplinas: DisciplinaArtistica[],
  otroDetalle: string,
  { exigirUna, t }: { exigirUna: boolean; t: TraductorEtiquetas },
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (exigirUna && disciplinas.length === 0) errores.creador_disciplinas = t("errorUna");
  if (disciplinas.includes("otro") && otroDetalle.trim().length < 2) {
    errores.creador_otro_detalle = t("errorOtro");
  }
  return errores;
}

/**
 * Todos los errores del formulario, por campo. Las reglas son las del perfil; el alta solo las
 * reparte en pasos (`erroresDelPaso`).
 */
export function validarPerfil(
  v: ValoresPerfil,
  opciones: {
    esAlta: boolean;
    cantidadFotos: number;
    /** El perfil de Creador se valida en el alta (opcional) o si la cuenta ya lo tiene. */
    validarCreador: boolean;
    /** Si ya tenía disciplinas, no puede quedarse sin ninguna. */
    exigirDisciplina: boolean;
    /** `perfil.formulario.errores`. */
    tError: TraductorEtiquetas;
    /** `perfil.etiquetas`. */
    tEtiquetas: TraductorEtiquetas;
    /** `perfil.creador`. */
    tCreador: TraductorEtiquetas;
  },
): Record<string, string> {
  const { tError } = opciones;
  const errores: Record<string, string> = {};

  if (v.nombre.trim().length < 2) errores.nombre = tError("nombre");
  const fechaIso = textoAIso(v.fechaNacimiento);
  if (!v.fechaNacimiento) errores.fecha_nacimiento = tError("fechaFalta");
  else if (!fechaIso) errores.fecha_nacimiento = tError("fechaFormato");
  else if (calcularEdad(fechaIso) < 16) errores.fecha_nacimiento = tError("fechaEdad");
  if (!v.ubicacion) errores.ubicacion = tError("ubicacion");
  if (!v.genero) errores.genero = tError("genero");
  if (v.generoDescripcion.length > MAX_GENERO_DESCRIPCION) {
    errores.genero_descripcion = tError("maximoCaracteres", { max: MAX_GENERO_DESCRIPCION });
  }
  // El mínimo de fotos es para **completar** el perfil (el alta). Al editar no bloquea: las
  // fotos se guardan solas al subirlas o borrarlas, y trabar el resto del formulario por eso
  // dejaba a cuentas viejas sin poder guardar nada (#243).
  if (opciones.esAlta && opciones.cantidadFotos < MIN_FOTOS) errores.fotos = tError("fotos");
  if (v.videoreelUrl && !esVideoreelValido(v.videoreelUrl)) errores.videoreel_url = tError("videoreel");
  if (v.experiencia.length > MAX_TEXTO_LARGO) {
    errores.experiencia = tError("maximoCaracteres", { max: MAX_TEXTO_LARGO });
  }
  if (v.formacion.length > MAX_TEXTO_LARGO) {
    errores.formacion = tError("maximoCaracteres", { max: MAX_TEXTO_LARGO });
  }

  const { errores: erroresRedes } = validarRedes(v.redes, opciones.tEtiquetas);
  for (const [clave, mensaje] of Object.entries(erroresRedes)) errores[`redes_${clave}`] = mensaje;

  if (opciones.validarCreador) {
    Object.assign(
      errores,
      validarCreador(v.disciplinas, v.otroDetalle, { exigirUna: opciones.exigirDisciplina, t: opciones.tCreador }),
    );
  }
  return errores;
}

/** Las columnas de `perfiles_talento` que salen del formulario (ya validado). */
export function columnasPerfil(v: ValoresPerfil) {
  return {
    nombre: v.nombre.trim(),
    fecha_nacimiento: textoAIso(v.fechaNacimiento)!,
    edad_visible: v.edadVisible,
    ...aColumnas(v.ubicacion!),
    genero: v.genero as Genero,
    genero_descripcion: v.genero === "otro" ? v.generoDescripcion.trim() || null : null,
    videoreel_url: v.videoreelUrl || null,
    experiencia: v.experiencia || null,
    formacion: v.formacion.trim() ? v.formacion : null,
    habilidades: v.habilidades,
    redes: validarRedes(v.redes).redes,
    aparece_en_buscador: v.apareceEnBuscador,
  };
}

/** `otro_detalle` solo si «Otro» sigue elegido: si se desmarca, el texto se va con él. */
export function columnasCreador(v: Pick<ValoresPerfil, "disciplinas" | "otroDetalle">) {
  return {
    disciplinas: v.disciplinas,
    otro_detalle: v.disciplinas.includes("otro") ? v.otroDetalle.trim() : null,
  };
}

// ── Pasos del alta (#383) ─────────────────────────────────────────────────────────────

/**
 * Lo obligatorio va primero (datos básicos y fotos); lo demás es opcional y no frena el avance;
 * el último paso es revisar y confirmar.
 */
export const TOTAL_PASOS = 6;
export const PASOS_OPCIONALES = new Set([3, 4, 5]);

/** Qué errores de `validarPerfil` corresponden a cada paso (la clave del campo). */
const CAMPOS_POR_PASO: Record<number, (clave: string) => boolean> = {
  1: (c) => ["nombre", "fecha_nacimiento", "ubicacion", "genero", "genero_descripcion"].includes(c),
  2: (c) => c === "fotos",
  3: (c) => c === "experiencia" || c === "formacion",
  4: (c) => c === "videoreel_url" || c.startsWith("redes_"),
  5: (c) => c.startsWith("creador_"),
};

export function erroresDelPaso(errores: Record<string, string>, paso: number): Record<string, string> {
  const pertenece = CAMPOS_POR_PASO[paso];
  if (!pertenece) return errores;
  return Object.fromEntries(Object.entries(errores).filter(([clave]) => pertenece(clave)));
}

/** El primer paso con algún error, para volver ahí si algo falla al confirmar. */
export function primerPasoConError(errores: Record<string, string>): number | null {
  for (let paso = 1; paso < TOTAL_PASOS; paso++) {
    if (Object.keys(erroresDelPaso(errores, paso)).length > 0) return paso;
  }
  return null;
}

// ── Borrador del alta (#300, #383) ────────────────────────────────────────────────────

/** Lo que se guarda del alta en el dispositivo y en `borradores_perfil`. */
export type Borrador = ValoresPerfil & { fotos: FotoTalento[]; paso: number; guardadoEn: number };

/** La clave del borrador en el almacenamiento del dispositivo. */
export const claveBorrador = (userId: string) => `yalope-alta-perfil-${userId}`;

function esUbicacion(u: unknown): u is Ubicacion {
  const x = u as Record<string, unknown> | null;
  return (
    !!x &&
    typeof x.texto === "string" &&
    typeof x.publica === "string" &&
    typeof x.pais === "string" &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng)
  );
}

function esFotoPendiente(f: unknown, userId: string): f is FotoTalento {
  const x = f as Record<string, unknown> | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.storage_path === "string" &&
    x.storage_path.startsWith(`${userId}/`) &&
    Number.isInteger(x.orden) &&
    typeof x.url === "string" &&
    x.enBd === false
  );
}

/**
 * El borrador sale del dispositivo o de la base: se valida la forma de cada campo antes de
 * usarlo, y se queda con el más nuevo de los dos. Devuelve solo lo que vino bien.
 */
export function elegirBorrador(
  userId: string,
  local: unknown,
  enBase: { paso: number; datos: unknown; actualizadoEn: string } | null | undefined,
): { valores: Partial<Borrador>; recuperado: boolean } | null {
  const deBase =
    enBase && enBase.datos && typeof enBase.datos === "object"
      ? { ...(enBase.datos as Record<string, unknown>), paso: enBase.paso, guardadoEn: Date.parse(enBase.actualizadoEn) }
      : null;
  const momento = (b: Record<string, unknown> | null) => (typeof b?.guardadoEn === "number" ? b.guardadoEn : 0);
  const b = [local as Record<string, unknown> | null, deBase]
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .sort((x, y) => momento(y) - momento(x))[0];
  if (!b) return null;

  const v: Partial<Borrador> = {};
  if (typeof b.nombre === "string" && b.nombre) v.nombre = b.nombre;
  // Borradores de antes de #307 guardaban la fecha en ISO: la pasa a texto quien la muestra.
  if (typeof b.fechaNacimiento === "string") v.fechaNacimiento = b.fechaNacimiento;
  if (typeof b.edadVisible === "boolean") v.edadVisible = b.edadVisible;
  if (esUbicacion(b.ubicacion)) v.ubicacion = b.ubicacion;
  if (typeof b.genero === "string") v.genero = b.genero as Genero | "";
  if (typeof b.generoDescripcion === "string") v.generoDescripcion = b.generoDescripcion;
  if (typeof b.videoreelUrl === "string") v.videoreelUrl = b.videoreelUrl;
  if (typeof b.experiencia === "string") v.experiencia = b.experiencia;
  if (typeof b.formacion === "string") v.formacion = b.formacion;
  if (Array.isArray(b.habilidades)) v.habilidades = b.habilidades.filter((h): h is string => typeof h === "string");
  if (b.redes && typeof b.redes === "object") v.redes = b.redes as Record<string, string>;
  if (typeof b.apareceEnBuscador === "boolean") v.apareceEnBuscador = b.apareceEnBuscador;
  if (Array.isArray(b.disciplinas)) {
    v.disciplinas = b.disciplinas.filter((d): d is DisciplinaArtistica => typeof d === "string");
  }
  if (typeof b.otroDetalle === "string") v.otroDetalle = b.otroDetalle;
  // Las fotos del alta ya están en Storage: alcanza con recordar dónde.
  if (Array.isArray(b.fotos)) {
    const validas = b.fotos.filter((f: unknown) => esFotoPendiente(f, userId)).slice(0, MAX_FOTOS);
    if (validas.length > 0) v.fotos = validas;
  }
  if (Number.isInteger(b.paso) && (b.paso as number) >= 1 && (b.paso as number) <= TOTAL_PASOS) {
    v.paso = b.paso as number;
  }
  // Solo se avisa si había algo cargado de verdad, no solo el nombre precargado.
  const recuperado = !!(b.fechaNacimiento || b.ubicacion || b.genero || (Array.isArray(b.fotos) && b.fotos.length));
  return { valores: v, recuperado };
}
