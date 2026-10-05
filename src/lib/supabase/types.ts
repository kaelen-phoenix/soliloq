export type RolUsuario = "talento" | "creador";

export type EstadoObra = "borrador" | "publicada" | "cerrada";

export type TipoRol = "actuacion" | "tecnica";

export type EstadoPostulacion =
  | "pendiente"
  | "en_duda"
  | "aprobado"
  | "rechazado"
  /** El creador eligió, pero la postulación era vieja: falta que el talento confirme. */
  | "esperando_confirmacion"
  /** Nadie decidió a tiempo y la espera se cerró sola. */
  | "vencida";

/**
 * Disciplinas que ejerce una persona en el medio. Reemplazó al par director/compañía, que
 * no gobernaba nada y dejaba afuera a casi todo el oficio. Es lista y no valor único porque
 * dirigir y actuar a la vez es la norma.
 */
export type DisciplinaArtistica =
  | "actuacion"
  | "direccion"
  | "guion"
  | "produccion"
  | "dramaturgia"
  | "vestuario"
  | "escenografia"
  | "iluminacion"
  | "sonido"
  | "coreografia"
  | "danza"
  | "musica"
  | "fotografia"
  | "edicion"
  | "maquillaje"
  | "asistencia_direccion"
  | "otro";

export type TipoNotificacion =
  | "match"
  | "sala_creada"
  | "convocado"
  | "espera_vencida"
  /** Interés mutuo entre dos personas, sin proyecto de por medio (0033). */
  | "equipo_armado"
  /** Alguien contactó desde el enlace público del perfil (0037), interés todavía no mutuo. */
  | "interes_recibido"
  /** Al Creador: se formó un match nuevo con un Talento (0068/0069, issue #160). */
  | "nuevo_match"
  /** A cada admin: alguien sin invitación pidió entrar (0092, #248). `de_perfil` = quién. */
  | "solicitud_acceso"
  /** A la persona: un admin la habilitó (0092, #247). */
  | "acceso_habilitado";

export type MotivoDenuncia =
  | "acoso"
  | "discriminacion"
  | "perfil_falso"
  | "estafa"
  | "contenido_inapropiado"
  | "convocatoria_enganosa"
  | "otro";

export type GeneroPersona = "mujer" | "varon" | "no_binarie" | "otro" | "sin_especificar";

export type UnidadDistancia = "km" | "mi";

/**
 * El esquema de la base sale generado de Supabase (#353, `npm run tipos-db`), no se escribe a
 * mano. Un solo ajuste: Postgres acepta `null` en cualquier argumento de una función y el
 * generador no lo refleja (los da como `string` o `string | undefined`), así que acá se suma
 * `| null` a los `Args` de cada función.
 */
import type { Database as Generada } from "./database.generated";
export type { Json } from "./database.generated";

type Funciones = Generada["public"]["Functions"];
type ArgsConNull<A> = [A] extends [never] ? A : { [K in keyof A]: A[K] | null };
type ConArgsNulos<F> = F extends { Args: infer A } ? Omit<F, "Args"> & { Args: ArgsConNull<A> } : F;

export type Database = Omit<Generada, "public"> & {
  public: Omit<Generada["public"], "Functions"> & {
    Functions: { [N in keyof Funciones]: ConArgsNulos<Funciones[N]> };
  };
};
