export type RolUsuario = "talento" | "creador";

export type EstadoObra = "borrador" | "publicada" | "cerrada";

export type TipoRol = "actuacion" | "tecnica";

export type EstadoPostulacion = "pendiente" | "en_duda" | "aprobado" | "rechazado";

export type TipoCreador = "director_independiente" | "compania";

export type TipoNotificacion = "match" | "sala_creada";

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
          creado_en: string;
        };
        Insert: {
          id: string;
          rol?: RolUsuario | null;
          modo_activo?: RolUsuario | null;
          onboarding_completo?: boolean;
        };
        Update: {
          rol?: RolUsuario | null;
          modo_activo?: RolUsuario | null;
          onboarding_completo?: boolean;
        };
        Relationships: [];
      };
      perfiles_talento: {
        Row: {
          id: string;
          nombre: string;
          fecha_nacimiento: string;
          locacion: string;
          videoreel_url: string | null;
          experiencia: string | null;
          habilidades: string[];
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre: string;
          fecha_nacimiento: string;
          locacion: string;
          videoreel_url?: string | null;
          experiencia?: string | null;
          habilidades?: string[];
        };
        Update: {
          nombre?: string;
          fecha_nacimiento?: string;
          locacion?: string;
          videoreel_url?: string | null;
          experiencia?: string | null;
          habilidades?: string[];
        };
        Relationships: [];
      };
      perfiles_creador: {
        Row: {
          id: string;
          nombre: string;
          tipo: TipoCreador;
          locacion: string;
          descripcion: string | null;
          imagen_url: string | null;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre: string;
          tipo: TipoCreador;
          locacion: string;
          descripcion?: string | null;
          imagen_url?: string | null;
        };
        Update: {
          nombre?: string;
          tipo?: TipoCreador;
          locacion?: string;
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
          locacion_ensayos: string;
          fecha_estreno_estimada: string | null;
          estado: EstadoObra;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          creador_id: string;
          titulo: string;
          sinopsis?: string | null;
          locacion_ensayos: string;
          fecha_estreno_estimada?: string | null;
          estado?: EstadoObra;
        };
        Update: {
          titulo?: string;
          sinopsis?: string | null;
          locacion_ensayos?: string;
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
        };
        Update: {
          nombre?: string;
          tipo?: TipoRol;
          edad_minima?: number | null;
          edad_maxima?: number | null;
          vacantes?: number;
          descripcion?: string | null;
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
      notificaciones: {
        Row: {
          id: string;
          destinatario_id: string;
          tipo: TipoNotificacion;
          obra_id: string | null;
          rol_id: string | null;
          sala_id: string | null;
          leida_en: string | null;
          creado_en: string;
        };
        Insert: {
          destinatario_id: string;
          tipo: TipoNotificacion;
          obra_id?: string | null;
          rol_id?: string | null;
          sala_id?: string | null;
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
          obra_id: string;
          creado_en: string;
        };
        Insert: {
          obra_id: string;
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
          obra_id: string;
          obra_titulo: string;
          obra_sinopsis: string | null;
          locacion_ensayos: string;
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
        Args: { p_talento_id: string };
        Returns: Database["public"]["Views"]["feed_talento"]["Row"][];
      };
    };
  };
}
