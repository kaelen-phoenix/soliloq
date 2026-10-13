/**
 * Las reglas de los Proyectos y Equipos del Creador, compartidas por la web
 * (`components/convocatorias/…`) y la app nativa (#393): validaciones, qué se guarda,
 * cuándo se puede publicar, cómo se agrupa la cobertura y cómo se ordena el tablero. Sin
 * React ni paquetes: lo importan las dos.
 *
 * Las validaciones devuelven la **clave** del texto (el mensaje lo pone quien lo muestra, en
 * su idioma).
 */
import type { Genero } from "@/lib/constantes";
import type { TipoRol } from "@/lib/supabase/types";
import { aColumnas, type Ubicacion } from "@/lib/ubicacion";

// ── Fotos ─────────────────────────────────────────────────────────────────────────────

/** #330: el tope de 2 se sacó; 10 queda como resguardo de almacenamiento (igual que la base, 0101). */
export const MAX_FOTOS_INICIATIVA = 10;
/** Para publicar un Proyecto hace falta al menos una (#162); el Equipo la recomienda. */
export const MIN_FOTOS_INICIATIVA = 1;
export const MAX_TEXTO_INICIATIVA = 2000;
export const MAX_TITULO_EQUIPO = 80;

/** La ruta arranca con el uid del creador para que aplique la política de Storage (0010). */
export function rutaFotoIniciativa(
  creadorId: string,
  tipo: "obra" | "equipo",
  iniciativaId: string,
  archivo: string,
) {
  return `${creadorId}/${tipo === "obra" ? "obras" : "equipos"}/${iniciativaId}/${archivo}`;
}

// ── Proyecto (obra) ───────────────────────────────────────────────────────────────────

export interface ValoresObra {
  titulo: string;
  sinopsis: string;
  ubicacion: Ubicacion | null;
  /** ISO (`aaaa-mm-dd`) o vacío. */
  fechaEstreno: string;
}

/**
 * Título y locación son obligatorios. Las claves cambian entre crear y editar (los textos de
 * la web son distintos), así que las elige quien llama.
 */
export function validarObra(
  v: Pick<ValoresObra, "titulo" | "ubicacion">,
  claves: { titulo: string; ubicacion: string },
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!v.titulo.trim()) errores.titulo = claves.titulo;
  if (!v.ubicacion) errores.ubicacion = claves.ubicacion;
  return errores;
}

/** Las columnas de `obras` que salen del formulario (ya validado). */
export function columnasObra(v: ValoresObra) {
  return {
    titulo: v.titulo.trim(),
    sinopsis: v.sinopsis.trim() || null,
    fecha_estreno_estimada: v.fechaEstreno || null,
    ...aColumnas(v.ubicacion!),
  };
}

/** Un rol cargado en el alta del Proyecto (#157): nombre y breve descripción. */
export interface RolNuevo {
  id: string;
  nombre: string;
  descripcion: string;
}

/** Las filas de `roles` de los cargados en el alta: de actuación, una vacante cada uno. */
export function filasRolesNuevos(obraId: string, roles: RolNuevo[]) {
  return roles.map((r) => ({
    obra_id: obraId,
    nombre: r.nombre,
    tipo: "actuacion" as const,
    vacantes: 1,
    descripcion: r.descripcion || null,
  }));
}

/** Para publicar hace falta al menos un rol y una foto (#162). `null` si se puede. */
export function problemaParaPublicar(roles: number, fotos: number): "faltaRol" | "faltaFoto" | null {
  if (roles === 0) return "faltaRol";
  if (fotos < MIN_FOTOS_INICIATIVA) return "faltaFoto";
  return null;
}

// ── Rol ───────────────────────────────────────────────────────────────────────────────

export interface ValoresRol {
  nombre: string;
  tipo: TipoRol;
  /** Como se escribe: vacío es «sin límite». */
  edadMinima: string;
  edadMaxima: string;
  vacantes: string;
  descripcion: string;
  /** Vacío = abierto a cualquier género (el default). */
  generos: Genero[];
}

/** La clave del error en `proyectos.formularioRol`, o `null`. */
export function validarRol(v: ValoresRol): "errorNombre" | "errorEdades" | "errorVacantes" | null {
  if (!v.nombre.trim()) return "errorNombre";
  const min = v.edadMinima ? Number(v.edadMinima) : null;
  const max = v.edadMaxima ? Number(v.edadMaxima) : null;
  if (min !== null && max !== null && min > max) return "errorEdades";
  const vacantes = Number(v.vacantes);
  if (!Number.isInteger(vacantes) || vacantes < 1) return "errorVacantes";
  return null;
}

/** La fila de `roles` (ya validada). */
export function columnasRol(obraId: string, v: ValoresRol) {
  return {
    obra_id: obraId,
    nombre: v.nombre.trim(),
    tipo: v.tipo,
    edad_minima: v.edadMinima ? Number(v.edadMinima) : null,
    edad_maxima: v.edadMaxima ? Number(v.edadMaxima) : null,
    vacantes: Number(v.vacantes),
    descripcion: v.descripcion || null,
    generos_buscados: v.generos,
  };
}

// ── Equipo ────────────────────────────────────────────────────────────────────────────

/** La clave del error en `proyectos.equipo`, o `null`. */
export function validarEquipo(titulo: string): "errorTitulo" | null {
  return titulo.trim().length < 1 ? "errorTitulo" : null;
}

export function columnasEquipo(v: { titulo: string; descripcion: string }) {
  return { titulo: v.titulo.trim(), descripcion: v.descripcion || null };
}

// ── Cobertura (#152) ──────────────────────────────────────────────────────────────────

/** Una fila de `cobertura_iniciativa`, con la foto ya resuelta a URL. */
export interface FilaCobertura {
  rolId: string | null;
  rolNombre: string | null;
  vacantes: number;
  convocatoriaId: string | null;
  talentoId: string | null;
  talentoNombre: string | null;
  talentoFotoUrl: string | null;
}

export interface GrupoCobertura {
  rolId: string | null;
  rolNombre: string | null;
  vacantes: number;
  ocupantes: { convocatoriaId: string; talentoId: string; nombre: string; fotoUrl: string | null }[];
}

/** Las filas de la base → un grupo por rol (o uno solo, para el Equipo), con quién lo ocupa. */
export function agruparCobertura(filas: FilaCobertura[], sinNombre: string): GrupoCobertura[] {
  const grupos = new Map<string, GrupoCobertura>();
  for (const f of filas) {
    const clave = f.rolId ?? "__equipo__";
    if (!grupos.has(clave)) {
      grupos.set(clave, { rolId: f.rolId, rolNombre: f.rolNombre, vacantes: f.vacantes, ocupantes: [] });
    }
    if (f.talentoId && f.convocatoriaId) {
      grupos.get(clave)!.ocupantes.push({
        convocatoriaId: f.convocatoriaId,
        talentoId: f.talentoId,
        nombre: f.talentoNombre ?? sinNombre,
        fotoUrl: f.talentoFotoUrl,
      });
    }
  }
  return [...grupos.values()];
}

/** Las filas crudas del RPC → `FilaCobertura`, con la URL pública de cada foto. */
export function filasCobertura(
  crudas: {
    rol_id: string | null;
    rol_nombre: string | null;
    vacantes: number;
    convocatoria_id: string | null;
    talento_id: string | null;
    talento_nombre: string | null;
    talento_foto: string | null;
  }[],
  urlPublica: (ruta: string) => string,
): FilaCobertura[] {
  return crudas.map((r) => ({
    rolId: r.rol_id,
    rolNombre: r.rol_nombre,
    vacantes: r.vacantes,
    convocatoriaId: r.convocatoria_id,
    talentoId: r.talento_id,
    talentoNombre: r.talento_nombre,
    talentoFotoUrl: r.talento_foto ? urlPublica(r.talento_foto) : null,
  }));
}

// ── Métricas (#57) ────────────────────────────────────────────────────────────────────

export interface MetricasObra {
  alcance: number;
  convocados: number;
  cupo: number | null;
  interes_recibido: number;
  matches: number;
}

/**
 * Qué mostrar del rendimiento: sin roles, sin alcance, o los números. La tasa es cuánta de la
 * gente que decidió algo (Me interesa o Paso) se interesó.
 */
export function resumirMetricas(
  m: MetricasObra | null | undefined,
): { estado: "sinRoles" } | { estado: "sinAlcance" } | { estado: "ok"; tasa: number; convocados: number; cupo: number } {
  if (!m || m.cupo === 0) return { estado: "sinRoles" };
  if (m.alcance === 0) return { estado: "sinAlcance" };
  const cupo = m.cupo ?? 0;
  return {
    estado: "ok",
    tasa: Math.round((m.interes_recibido / m.alcance) * 100),
    convocados: Math.min(m.convocados, cupo),
    cupo,
  };
}

// ── Tablero (#341) ────────────────────────────────────────────────────────────────────

export interface ItemTablero {
  id: string;
  tipo: "proyecto" | "equipo";
  titulo: string;
  /** La clave de `proyectos.tablero.estado`. */
  estado: "borrador" | "publicada" | "cerrada" | "activo" | "cerrado";
  creadoEn: string;
}

/** Proyectos y Equipos en una sola lista, lo más nuevo primero. */
export function itemsTablero(
  obras: { id: string; titulo: string; estado: string; creado_en: string }[],
  equipos: { id: string; titulo: string; activo: boolean; creado_en: string }[],
): ItemTablero[] {
  return [
    ...obras.map((o) => ({
      id: o.id,
      tipo: "proyecto" as const,
      titulo: o.titulo,
      estado: o.estado as ItemTablero["estado"],
      creadoEn: o.creado_en,
    })),
    ...equipos.map((e) => ({
      id: e.id,
      tipo: "equipo" as const,
      titulo: e.titulo,
      estado: (e.activo ? "activo" : "cerrado") as ItemTablero["estado"],
      creadoEn: e.creado_en,
    })),
  ].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}
