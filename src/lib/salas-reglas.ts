/**
 * Las reglas de los chats (salas), compartidas por la web (`/salas`, `components/salas`) y la
 * app nativa (#394). Sin React ni paquetes: solo lógica.
 */

export interface SalaItem {
  salaId: string;
  titulo: string;
  esEquipo: boolean;
  /** `false` en los chats directos (sin Proyecto ni Equipo): llevan la etiqueta «Directo». */
  esDeIniciativa: boolean;
  ultimoMensaje: string | null;
  ultimaActividad: string | null;
  destacadoEn: string | null;
  esDueno: boolean;
}

/** Destacados primero (último destacado arriba), después el resto por actividad reciente. */
export function ordenarSalas<T extends Pick<SalaItem, "destacadoEn" | "ultimaActividad">>(salas: T[]): T[] {
  return [...salas].sort((a, b) => {
    if (a.destacadoEn && b.destacadoEn) return b.destacadoEn.localeCompare(a.destacadoEn);
    if (a.destacadoEn) return -1;
    if (b.destacadoEn) return 1;
    return (b.ultimaActividad ?? "").localeCompare(a.ultimaActividad ?? "");
  });
}

/**
 * Por cada chat directo, el nombre de quienes no son uno («Perfil sin completar» si no tienen):
 * el título se lee ahora y no el «A y B» que quedó guardado al crearse.
 */
export function nombresDeLosOtros(
  salaIds: string[],
  integrantes: { sala_id: string; perfil_id: string }[],
  talentos: { id: string; nombre: string }[],
  textos: { sinCompletar: string; separador: string },
): Map<string, string> {
  const nombres = new Map<string, string>();
  const nombre = new Map(talentos.map((t) => [t.id, t.nombre]));
  for (const salaId of salaIds) {
    const otros = integrantes
      .filter((i) => i.sala_id === salaId)
      .map((i) => nombre.get(i.perfil_id) ?? textos.sinCompletar);
    if (otros.length) nombres.set(salaId, otros.join(textos.separador));
  }
  return nombres;
}

/** Una fila de `salas_no_leidas()` (0082): solo vienen las salas con algo sin leer. */
export interface FilaNoLeidos {
  sala_id: string;
  no_leidos: number;
  es_de_iniciativa: boolean;
  es_dueno: boolean;
}

/**
 * Sin leer por sala y el total del badge de «Chats» (#216). La sala que está abierta no cuenta:
 * el chat la marca leída a medida que llegan mensajes, y sin esto el badge parpadearía.
 */
export function contarNoLeidos(filas: FilaNoLeidos[], salaAbierta: string | null) {
  const porSala = new Map<string, number>();
  for (const f of filas) {
    if (f.sala_id !== salaAbierta && f.no_leidos > 0) porSala.set(f.sala_id, f.no_leidos);
  }
  let total = 0;
  porSala.forEach((n) => (total += n));
  return { porSala, total };
}

/** El número de un badge: tope «9+». */
export function textoBadge(cantidad: number): string {
  return cantidad > 9 ? "9+" : String(cantidad);
}

/** Primer nombre: en el chat no hay lugar para nombre y apellido (#149). */
export function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** El error de `desvincularme_de_sala` → clave de `chats.acciones`. */
export function claveErrorDesvincular(mensaje: string | undefined): "errorDueno" | "errorGenerico" {
  return mensaje?.includes("dueño") ? "errorDueno" : "errorGenerico";
}

/** El rol con que aparece cada integrante en la sala (`chats.paginas`). */
export function claveRolEnSala(esDirector: boolean, esDeIniciativa: boolean): "director" | "elenco" | "contacto" {
  return esDirector ? "director" : esDeIniciativa ? "elenco" : "contacto";
}

/** Tope de un mensaje (lo valida también la base). */
export const MAX_MENSAJE = 2000;
