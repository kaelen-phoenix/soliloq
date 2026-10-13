/**
 * Las notificaciones de la campanita, compartidas por la web (`lista-notificaciones.tsx`) y la
 * app nativa (#394). Sin React ni paquetes.
 */

/** A dónde lleva tocar una notificación. `null`: a ningún lado (solo se marca leída). */
export function destinoNotificacion(n: {
  tipo: string;
  sala_id: string | null;
  obra_id: string | null;
}): string | null {
  if ((n.tipo === "sala_creada" || n.tipo === "equipo_armado") && n.sala_id) return `/salas/${n.sala_id}`;
  // #143: el Talento confirma la convocatoria antes de entrar a la sala.
  if (n.tipo === "convocado") return "/convocatoria";
  if (n.tipo === "match" && n.obra_id) return `/obras/${n.obra_id}`;
  if (n.tipo === "nuevo_match") return "/matches";
  if (n.tipo === "solicitud_acceso") return "/admin";
  if (n.tipo === "acceso_habilitado") return "/perfil";
  return null;
}

/** PostgREST devuelve la relación como objeto o como array según la cardinalidad que infiere. */
export function primeraFila<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
