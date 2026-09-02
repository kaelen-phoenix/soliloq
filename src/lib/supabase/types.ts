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
  | "interes_recibido";

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

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          /** Rol con el que arrancó la cuenta; no determina qué puede hacer. */
          rol: RolUsuario | null;
          modo_activo: RolUsuario | null;
          onboarding_completo: boolean;
          /** Opt-in explícito para aparecer en el feed de personas (0033). */
          busca_equipo: boolean;
          pitch: string | null;
          /** Token del enlace público del perfil (0037). Existe siempre; solo resuelve con `enlace_publico_activo`. */
          enlace_token: string;
          enlace_publico_activo: boolean;
          creado_en: string;
        };
        Insert: {
          id: string;
          rol?: RolUsuario | null;
          modo_activo?: RolUsuario | null;
          onboarding_completo?: boolean;
          enlace_token?: string;
          enlace_publico_activo?: boolean;
        };
        Update: {
          rol?: RolUsuario | null;
          modo_activo?: RolUsuario | null;
          onboarding_completo?: boolean;
          busca_equipo?: boolean;
          pitch?: string | null;
          enlace_token?: string;
          enlace_publico_activo?: boolean;
        };
        Relationships: [];
      };
      perfiles_talento: {
        Row: {
          id: string;
          nombre: string;
          fecha_nacimiento: string;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          genero: GeneroPersona;
          genero_descripcion: string | null;
          /** Siempre en metros; `null` significa "todo el mundo". */
          radio_busqueda_metros: number | null;
          unidad_distancia: UnidadDistancia;
          videoreel_url: string | null;
          experiencia: string | null;
          habilidades: string[];
          /** Objeto `{ [claveRed]: urlCanonica }` con claves del catálogo `REDES`. `{}` = sin redes. */
          redes: Record<string, string>;
          /** Opt-in del buscador de creadores (migración 0036). `true` por defecto. */
          aparece_en_buscador: boolean;
          /** `null` = todavía no vio las tarjetas de ejemplo del feed (migración 0024). */
          onboarding_visto_en: string | null;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre: string;
          fecha_nacimiento: string;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          genero: GeneroPersona;
          genero_descripcion?: string | null;
          radio_busqueda_metros?: number | null;
          unidad_distancia?: UnidadDistancia;
          videoreel_url?: string | null;
          experiencia?: string | null;
          habilidades?: string[];
          redes?: Record<string, string>;
          aparece_en_buscador?: boolean;
        };
        Update: {
          nombre?: string;
          fecha_nacimiento?: string;
          ubicacion_texto?: string;
          ubicacion_publica?: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat?: number;
          ubicacion_lng?: number;
          ubicacion_pais?: string;
          genero?: GeneroPersona;
          genero_descripcion?: string | null;
          radio_busqueda_metros?: number | null;
          unidad_distancia?: UnidadDistancia;
          videoreel_url?: string | null;
          experiencia?: string | null;
          habilidades?: string[];
          redes?: Record<string, string>;
          aparece_en_buscador?: boolean;
          onboarding_visto_en?: string | null;
        };
        Relationships: [];
      };
      perfiles_creador: {
        Row: {
          id: string;
          nombre: string;
          disciplinas: DisciplinaArtistica[];
          otro_detalle: string | null;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          descripcion: string | null;
          imagen_url: string | null;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre: string;
          disciplinas: DisciplinaArtistica[];
          otro_detalle?: string | null;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          descripcion?: string | null;
          imagen_url?: string | null;
        };
        Update: {
          nombre?: string;
          disciplinas?: DisciplinaArtistica[];
          otro_detalle?: string | null;
          ubicacion_texto?: string;
          ubicacion_publica?: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat?: number;
          ubicacion_lng?: number;
          ubicacion_pais?: string;
          descripcion?: string | null;
          imagen_url?: string | null;
        };
        Relationships: [];
      };
      obras_previas: {
        Row: {
          id: string;
          creador_id: string;
          titulo: string;
          anio: number;
          rol_desempenado: string;
          creado_en: string;
        };
        Insert: {
          creador_id: string;
          titulo: string;
          anio: number;
          rol_desempenado: string;
        };
        Update: {
          titulo?: string;
          anio?: number;
          rol_desempenado?: string;
        };
        Relationships: [
          {
            foreignKeyName: "obras_previas_creador_id_fkey";
            columns: ["creador_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_creador";
            referencedColumns: ["id"];
          }
        ];
      };
      fotos_talento: {
        Row: {
          id: string;
          talento_id: string;
          storage_path: string;
          orden: number;
          creado_en: string;
        };
        Insert: {
          talento_id: string;
          storage_path: string;
          orden: number;
        };
        Update: {
          orden?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fotos_talento_talento_id_fkey";
            columns: ["talento_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_talento";
            referencedColumns: ["id"];
          }
        ];
      };
      obras: {
        Row: {
          id: string;
          creador_id: string;
          titulo: string;
          sinopsis: string | null;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          fecha_estreno_estimada: string | null;
          estado: EstadoObra;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          creador_id: string;
          titulo: string;
          sinopsis?: string | null;
          ubicacion_texto: string;
          ubicacion_publica: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat: number;
          ubicacion_lng: number;
          ubicacion_pais: string;
          fecha_estreno_estimada?: string | null;
          estado?: EstadoObra;
        };
        Update: {
          titulo?: string;
          sinopsis?: string | null;
          ubicacion_texto?: string;
          ubicacion_publica?: string;
          ubicacion_place_id?: string | null;
          ubicacion_lat?: number;
          ubicacion_lng?: number;
          ubicacion_pais?: string;
          fecha_estreno_estimada?: string | null;
          estado?: EstadoObra;
        };
        Relationships: [
          {
            foreignKeyName: "obras_creador_id_fkey";
            columns: ["creador_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_creador";
            referencedColumns: ["id"];
          }
        ];
      };
      roles: {
        Row: {
          id: string;
          obra_id: string;
          nombre: string;
          tipo: TipoRol;
          edad_minima: number | null;
          edad_maxima: number | null;
          vacantes: number;
          descripcion: string | null;
          /** Vacío significa abierto a cualquier género. */
          generos_buscados: GeneroPersona[];
          creado_en: string;
        };
        Insert: {
          obra_id: string;
          nombre: string;
          tipo: TipoRol;
          edad_minima?: number | null;
          edad_maxima?: number | null;
          vacantes: number;
          descripcion?: string | null;
          generos_buscados?: GeneroPersona[];
        };
        Update: {
          nombre?: string;
          tipo?: TipoRol;
          edad_minima?: number | null;
          edad_maxima?: number | null;
          vacantes?: number;
          descripcion?: string | null;
          generos_buscados?: GeneroPersona[];
        };
        Relationships: [
          {
            foreignKeyName: "roles_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          }
        ];
      };
      postulaciones: {
        Row: {
          id: string;
          rol_id: string;
          talento_id: string;
          estado: EstadoPostulacion;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          rol_id: string;
          talento_id: string;
          estado?: EstadoPostulacion;
        };
        Update: {
          estado?: EstadoPostulacion;
        };
        Relationships: [
          {
            foreignKeyName: "postulaciones_rol_id_fkey";
            columns: ["rol_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "postulaciones_talento_id_fkey";
            columns: ["talento_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_talento";
            referencedColumns: ["id"];
          }
        ];
      };
      descartes: {
        Row: {
          id: string;
          rol_id: string;
          talento_id: string;
          creado_en: string;
        };
        Insert: {
          rol_id: string;
          talento_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      intereses_equipo: {
        Row: {
          de_perfil: string;
          a_perfil: string;
          interesa: boolean;
          creado_en: string;
        };
        Insert: {
          de_perfil: string;
          a_perfil: string;
          interesa: boolean;
        };
        Update: { interesa?: boolean };
        Relationships: [];
      };
      denuncias: {
        Row: {
          id: string;
          denunciante_id: string;
          perfil_denunciado_id: string | null;
          obra_id: string | null;
          sala_id: string | null;
          motivo: MotivoDenuncia;
          detalle: string | null;
          creado_en: string;
        };
        Insert: {
          denunciante_id: string;
          perfil_denunciado_id?: string | null;
          obra_id?: string | null;
          sala_id?: string | null;
          motivo: MotivoDenuncia;
          detalle?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      notificaciones: {
        Row: {
          id: string;
          destinatario_id: string;
          tipo: TipoNotificacion;
          obra_id: string | null;
          rol_id: string | null;
          sala_id: string | null;
          /** Quién generó el interés, para `interes_recibido` (0037). `null` en el resto de los tipos. */
          de_perfil: string | null;
          leida_en: string | null;
          creado_en: string;
        };
        Insert: {
          destinatario_id: string;
          tipo: TipoNotificacion;
          obra_id?: string | null;
          rol_id?: string | null;
          sala_id?: string | null;
          de_perfil?: string | null;
        };
        Update: {
          leida_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notificaciones_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_sala_fk";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          }
        ];
      };
      salas: {
        Row: {
          id: string;
          /** `null` en las salas de "armar equipo": nacen de un interés mutuo, sin obra. */
          obra_id: string | null;
          /** Solo para salas sin obra; con obra, el título lo presta ella. */
          titulo: string | null;
          creado_en: string;
        };
        Insert: {
          obra_id?: string | null;
          titulo?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "salas_obra_id_fkey";
            columns: ["obra_id"];
            isOneToOne: true;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          }
        ];
      };
      sala_integrantes: {
        Row: {
          sala_id: string;
          perfil_id: string;
          incorporado_en: string;
        };
        Insert: {
          sala_id: string;
          perfil_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "sala_integrantes_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sala_integrantes_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          }
        ];
      };
      mensajes: {
        Row: {
          id: string;
          sala_id: string;
          autor_id: string;
          contenido: string;
          creado_en: string;
        };
        Insert: {
          sala_id: string;
          autor_id: string;
          contenido: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "mensajes_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mensajes_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      feed_talento: {
        Row: {
          rol_id: string;
          rol_nombre: string;
          rol_tipo: TipoRol;
          edad_minima: number | null;
          edad_maxima: number | null;
          rol_descripcion: string | null;
          vacantes: number;
          generos_buscados: GeneroPersona[];
          obra_id: string;
          obra_titulo: string;
          obra_sinopsis: string | null;
          obra_ubicacion_texto: string;
          obra_ubicacion_lat: number;
          obra_ubicacion_lng: number;
          obra_ubicacion_pais: string;
          obra_creado_en: string;
          creador_id: string;
          creador_nombre: string;
          creador_imagen_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      feed_para_talento: {
        /** `p_radio_metros` en null trae roles de cualquier locación. */
        Args: { p_talento_id: string; p_radio_metros?: number | null };
        Returns: Database["public"]["Views"]["feed_talento"]["Row"][];
      };
      /**
       * Grilla del buscador de talento (modo creador). Proyección acotada: nunca
       * `fecha_nacimiento` ni ubicación exacta. Filtra y pagina en Postgres (0036).
       */
      buscar_talento: {
        Args: {
          p_texto?: string | null;
          p_edad_min?: number | null;
          p_edad_max?: number | null;
          p_generos?: GeneroPersona[];
          p_habilidades?: string[];
          p_lat?: number | null;
          p_lng?: number | null;
          p_radio_metros?: number | null;
          p_limite?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          nombre: string;
          edad: number;
          ubicacion_publica: string;
          habilidades: string[];
          foto_principal_path: string;
        }[];
      };
      /**
       * Métricas por rol de una obra propia. Es una función y no una consulta directa
       * porque el alcance sale de `descartes`, que solo puede leer el propio talento:
       * acá se devuelven conteos, nunca identidades.
       */
      /** Personas anotadas para armar equipo. Proyección acotada: sin fotos de talento,
       *  sin edad y sin ubicación exacta — ver 0033. */
      feed_equipo: {
        Args: { p_radio_metros?: number | null };
        Returns: {
          perfil_id: string;
          nombre: string;
          pitch: string | null;
          ubicacion_publica: string | null;
          disciplinas: DisciplinaArtistica[];
          otro_detalle: string | null;
          habilidades: string[];
          imagen_url: string | null;
          es_talento: boolean;
          es_creador: boolean;
          distancia_metros: number | null;
        }[];
      };
      /**
       * Vidriera anónima del enlace público (0037). Proyección acotada por diseño: nunca
       * fecha de nacimiento, género, ubicación, redes ni videoreel. Cero filas = token
       * inválido o enlace apagado (404 indistinguible).
       */
      perfil_publico: {
        Args: { p_token: string };
        Returns: {
          tipo: "talento" | "creador";
          nombre: string;
          texto: string | null;
          habilidades: string[];
          disciplinas: DisciplinaArtistica[];
          otro_detalle: string | null;
          fotos: string[];
        }[];
      };
      /**
       * Contacto desde el enlace público (0037): marca interés hacia el dueño y notifica
       * `interes_recibido` si todavía no es mutuo. Rechaza token inválido, perfil propio y
       * pares bloqueados con `raise exception`.
       */
      contactar_desde_perfil: {
        Args: { p_token: string };
        Returns: void;
      };
      /**
       * Proyección acotada de quien contactó desde un enlace público, para responder el
       * interés (0037). Solo visible para quien recibió ese interés.
       */
      perfil_para_responder: {
        Args: { p_de: string };
        Returns: {
          perfil_id: string;
          nombre: string;
          pitch: string | null;
          ubicacion_publica: string | null;
          disciplinas: DisciplinaArtistica[];
          otro_detalle: string | null;
          habilidades: string[];
          es_talento: boolean;
          es_creador: boolean;
        }[];
      };
      metricas_obra: {
        Args: { p_obra_id: string };
        Returns: {
          rol_id: string;
          rol_nombre: string;
          vacantes: number;
          alcance: number;
          postulaciones: number;
          pendientes: number;
          en_duda: number;
          aprobados: number;
          rechazados: number;
        }[];
      };
    };
  };
}
