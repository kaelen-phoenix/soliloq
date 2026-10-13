/**
 * Convocatorias (web `/matches`) y Buscar talento, compartidos por la web y la app nativa
 * (#393): cómo se arman las filas de cada pestaña, qué roles se pueden elegir al convocar, qué
 * texto corresponde a cada error de la base y con qué parámetros se busca talento. Sin React
 * ni paquetes: lo importan las dos.
 */
import type { Genero } from "@/lib/constantes";
import type { Database } from "@/lib/supabase/types";
import type { Ubicacion } from "@/lib/ubicacion";

type Rpc<N extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][N];
type Fila<N extends keyof Database["public"]["Functions"]> = Rpc<N> extends { Returns: (infer F)[] } ? F : never;

// ── Errores de la base → clave del texto ──────────────────────────────────────────────

/** Clave en `proyectos.matches.errores`. */
export type ErrorMatches =
  | "cerrarAviso"
  | "rolLleno"
  | "rolInvalido"
  | "cupoLleno"
  | "primeroAcepta"
  | "yaConvocada"
  | "convocar"
  | "yaAcepto"
  | "descartar"
  | "darDeBaja"
  | "sinSesion"
  | "sinIniciativa"
  | "aplicar"
  | "yaEnChat";

/**
 * Lo que la base explica en el mensaje del error de cada RPC. `null` si no es ninguno de los
 * esperados: ahí el que llama reporta el error y muestra el genérico de esa acción.
 */
export function errorConocidoConvocar(mensaje: string | undefined): ErrorMatches | null {
  const m = mensaje ?? "";
  if (m.includes("rol_lleno")) return "rolLleno";
  if (m.includes("rol inválido")) return "rolInvalido";
  if (m.includes("cupo_lleno")) return "cupoLleno";
  if (m.includes("primero aceptá")) return "primeroAcepta";
  if (m.includes("ya está convocado")) return "yaConvocada";
  return null;
}

export function errorConocidoDescartar(mensaje: string | undefined): ErrorMatches | null {
  return mensaje?.includes("ya aceptó") ? "yaAcepto" : null;
}

export function errorConocidoRetirarme(mensaje: string | undefined): ErrorMatches | null {
  return mensaje?.includes("ya estás en el chat") ? "yaEnChat" : null;
}

/** Clave en `chats.acciones` al desvincularse de una sala. */
export function errorConocidoDesvincularSala(mensaje: string | undefined): "errorDueno" | null {
  return mensaje?.includes("dueño") ? "errorDueno" : null;
}

// ── Filas de Convocatorias ───────────────────────────────────────────────────────────

export type EstadoConvocado = "en_convocados" | "esperando_confirmacion" | "en_sala";

export interface FilaConvocado {
  matchId: string;
  convocatoriaId: string | null;
  talentoId: string;
  nombre: string;
  fotoUrl: string | null;
  esEquipo: boolean;
  iniciativaTitulo: string;
  estado: EstadoConvocado;
  /** Match nuevo (todavía sin convocar): cuándo vence. */
  expiraEn?: string | null;
  /** El Proyecto del match (null en un Equipo): de ahí salen los roles para elegir (#330). */
  obraId?: string | null;
  /** La iniciativa ya llenó su cupo: no se puede convocar a nadie más. */
  cupoLleno?: boolean;
}

export interface FilaMatchTalento {
  matchId: string;
  esEquipo: boolean;
  obraId: string | null;
  titulo: string;
  fotoUrl: string | null;
  creadorNombre: string | null;
  expiraEn: string;
  estado: "match" | "convocado" | "en_sala";
  salaId: string | null;
}

export interface MatchNuevo {
  matchId: string;
  nombre: string;
  fotoUrl: string | null;
  esEquipo: boolean;
  iniciativaTitulo: string;
  iniciativaFotoUrl: string | null;
}

export interface RolDisponible {
  id: string;
  nombre: string;
  disponible: boolean;
}

/**
 * Los roles de un Proyecto para elegir al convocar (#152): uno por rol, y cubierto si ya tiene
 * tantos convocados como vacantes.
 */
export function rolesDeCobertura(cobertura: Fila<"cobertura_iniciativa">[] | null): RolDisponible[] {
  const filas = cobertura ?? [];
  return [...new Map(filas.filter((r) => r.rol_id).map((r) => [r.rol_id, r])).values()].map((r) => ({
    id: r.rol_id as string,
    nombre: r.rol_nombre as string,
    disponible: filas.filter((x) => x.rol_id === r.rol_id && x.talento_id).length < r.vacantes,
  }));
}

/** Los Proyectos (no Equipos) con algún match o convocado: a esos se les piden los roles. */
export function obrasConMatches(
  matches: Fila<"mis_matches">[] | null,
  convocados: Fila<"mis_convocados">[] | null,
): string[] {
  return Array.from(
    new Set([...(matches ?? []), ...(convocados ?? [])].map((m) => m.obra_id).filter((x): x is string => !!x)),
  );
}

/**
 * Las filas de las dos pestañas y los avisos «Hay interés» pendientes, a partir de las tres
 * RPC (`mis_matches`, `mis_convocados`, `mis_matches_como_talento`). `url` pasa un path de
 * Storage a su URL pública.
 */
export function armarConvocatorias(
  matches: Fila<"mis_matches">[] | null,
  convocados: Fila<"mis_convocados">[] | null,
  comoTalento: Fila<"mis_matches_como_talento">[] | null,
  url: (path: string | null) => string | null,
) {
  // #287: un match nuevo se convoca directo, en la misma lista que los convocados.
  const filasMatches: FilaConvocado[] = (matches ?? []).map((m) => ({
    matchId: m.match_id,
    convocatoriaId: null,
    talentoId: m.talento_id,
    nombre: m.nombre,
    fotoUrl: url(m.foto_path),
    esEquipo: m.es_equipo,
    iniciativaTitulo: m.iniciativa_titulo,
    estado: "en_convocados",
    expiraEn: m.expira_en,
    cupoLleno: m.cupo_lleno,
    obraId: m.obra_id,
  }));
  const filasConvocados: FilaConvocado[] = (convocados ?? []).map((c) => ({
    matchId: c.match_id,
    convocatoriaId: c.convocatoria_id,
    talentoId: c.talento_id,
    nombre: c.nombre,
    fotoUrl: url(c.foto_path),
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    estado: c.estado as EstadoConvocado,
    obraId: c.obra_id,
  }));
  const filasTalento: FilaMatchTalento[] = (comoTalento ?? []).map((m) => ({
    matchId: m.match_id,
    esEquipo: m.es_equipo,
    obraId: m.obra_id,
    titulo: m.iniciativa_titulo,
    fotoUrl: url(m.iniciativa_foto),
    creadorNombre: m.creador_nombre,
    expiraEn: m.expira_en,
    estado: m.estado as FilaMatchTalento["estado"],
    salaId: m.sala_id,
  }));
  // Aviso de «Hay interés» (#194): uno por match, la primera vez que se entra después.
  const nuevos: MatchNuevo[] = (matches ?? [])
    .filter((m) => !m.mostrado_en)
    .map((m) => ({
      matchId: m.match_id,
      nombre: m.nombre,
      fotoUrl: url(m.foto_path),
      esEquipo: m.es_equipo,
      iniciativaTitulo: m.iniciativa_titulo,
      iniciativaFotoUrl: url(m.iniciativa_foto),
    }));
  return { filasCreador: [...filasMatches, ...filasConvocados], filasTalento, nuevos };
}

/**
 * #304: arranca en la pestaña que tiene algo; si ninguna, en la de proyectos solo si tiene uno
 * abierto.
 */
export function pestanaInicial(
  cantidadProyectos: number,
  cantidadTalento: number,
  tieneIniciativaActiva: boolean,
): "proyectos" | "talento" {
  if (cantidadProyectos > 0) return "proyectos";
  return cantidadTalento > 0 || !tieneIniciativaActiva ? "talento" : "proyectos";
}

/** Clave (en `proyectos.convocados`) de cuánto le queda a un match nuevo. */
export function vencimiento(expiraEn: string, ahora = Date.now()): { clave: "venceHoy" | "venceManana" | "venceEn"; dias: number } {
  const dias = Math.ceil((new Date(expiraEn).getTime() - ahora) / 86_400_000);
  if (dias <= 0) return { clave: "venceHoy", dias };
  if (dias === 1) return { clave: "venceManana", dias };
  return { clave: "venceEn", dias };
}

// ── Buscar talento ───────────────────────────────────────────────────────────────────

export const PAGINA_TALENTO = 24;

/** Para qué Proyecto o Equipo se busca (#294): ahí se marca el interés. */
export interface IniciativaBuscada {
  tipo: "obra" | "equipo";
  id: string;
  titulo: string;
}

export interface FiltrosTalento {
  texto: string;
  edadMin: string;
  edadMax: string;
  generos: Genero[];
  habilidades: string[];
  ubicacion: Ubicacion | null;
  radioMetros: number | null;
}

/** Los parámetros de `buscar_talento` para una página. */
export function parametrosBuscarTalento(
  f: FiltrosTalento,
  iniciativa: Pick<IniciativaBuscada, "tipo" | "id"> | null,
  offset: number,
): Rpc<"buscar_talento">["Args"] {
  const conGeo = !!f.ubicacion && f.radioMetros !== null;
  return {
    p_texto: f.texto.trim() || null,
    p_edad_min: f.edadMin ? Number(f.edadMin) : null,
    p_edad_max: f.edadMax ? Number(f.edadMax) : null,
    p_generos: f.generos.length ? f.generos : undefined,
    p_habilidades: f.habilidades.length ? f.habilidades : undefined,
    p_lat: conGeo ? f.ubicacion!.lat : null,
    p_lng: conGeo ? f.ubicacion!.lng : null,
    p_radio_metros: conGeo ? f.radioMetros : null,
    p_limite: PAGINA_TALENTO,
    p_offset: offset,
    // #372: se excluye solo a quien ya se decidió para ESTA iniciativa; quien se descartó o no
    // se eligió para otro Proyecto o Equipo vuelve a aparecer.
    p_obra_id: iniciativa?.tipo === "obra" ? iniciativa.id : null,
    p_equipo_id: iniciativa?.tipo === "equipo" ? iniciativa.id : null,
  } as Rpc<"buscar_talento">["Args"];
}

/** Cuántos grupos de filtros avanzados están puestos (el número junto a «Filtros»). */
export function filtrosAvanzadosActivos(f: FiltrosTalento): number {
  return (
    (f.edadMin !== "" || f.edadMax !== "" ? 1 : 0) +
    (f.generos.length > 0 ? 1 : 0) +
    (f.habilidades.length > 0 ? 1 : 0) +
    (f.ubicacion !== null ? 1 : 0)
  );
}

export function hayFiltrosTalento(f: FiltrosTalento): boolean {
  return f.texto.trim() !== "" || filtrosAvanzadosActivos(f) > 0;
}

/**
 * Después de marcar «Me interesa»: el match con este talento para ESTA iniciativa, si se formó
 * (del mismo talento puede haber uno anterior con otra iniciativa).
 */
export function matchDeLaIniciativa(
  matches: Fila<"mis_matches">[] | null,
  talentoId: string,
  iniciativa: IniciativaBuscada,
): string | null {
  const m = (matches ?? []).find(
    (x) =>
      x.talento_id === talentoId &&
      x.es_equipo === (iniciativa.tipo === "equipo") &&
      x.iniciativa_titulo === iniciativa.titulo,
  );
  return m?.match_id ?? null;
}
