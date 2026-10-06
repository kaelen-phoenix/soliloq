// Generado por `node scripts/tipos-db.mjs` desde el esquema de la base. No editar a mano.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bloqueos: {
        Row: {
          creado_en: string
          creado_por: string
          motivo: string | null
          perfil_mayor: string
          perfil_menor: string
        }
        Insert: {
          creado_en?: string
          creado_por: string
          motivo?: string | null
          perfil_mayor: string
          perfil_menor: string
        }
        Update: {
          creado_en?: string
          creado_por?: string
          motivo?: string | null
          perfil_mayor?: string
          perfil_menor?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueos_perfil_mayor_fkey"
            columns: ["perfil_mayor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueos_perfil_menor_fkey"
            columns: ["perfil_menor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats_destacados: {
        Row: {
          creado_en: string
          perfil_id: string
          sala_id: string
        }
        Insert: {
          creado_en?: string
          perfil_id: string
          sala_id: string
        }
        Update: {
          creado_en?: string
          perfil_id?: string
          sala_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_destacados_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_destacados_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      convocatorias: {
        Row: {
          creado_en: string
          estado: Database["public"]["Enums"]["estado_convocatoria"]
          id: string
          match_id: string
          respondido_en: string | null
          rol_id: string | null
        }
        Insert: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_convocatoria"]
          id?: string
          match_id: string
          respondido_en?: string | null
          rol_id?: string | null
        }
        Update: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_convocatoria"]
          id?: string
          match_id?: string
          respondido_en?: string | null
          rol_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convocatorias_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocatorias_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["rol_id"]
          },
          {
            foreignKeyName: "convocatorias_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      denuncias: {
        Row: {
          creado_en: string
          denunciante_id: string
          detalle: string | null
          estado: Database["public"]["Enums"]["estado_denuncia"]
          id: string
          motivo: Database["public"]["Enums"]["motivo_denuncia"]
          obra_id: string | null
          perfil_denunciado_id: string | null
          resolucion: string | null
          resuelto_en: string | null
          sala_id: string | null
        }
        Insert: {
          creado_en?: string
          denunciante_id: string
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_denuncia"]
          id?: string
          motivo: Database["public"]["Enums"]["motivo_denuncia"]
          obra_id?: string | null
          perfil_denunciado_id?: string | null
          resolucion?: string | null
          resuelto_en?: string | null
          sala_id?: string | null
        }
        Update: {
          creado_en?: string
          denunciante_id?: string
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_denuncia"]
          id?: string
          motivo?: Database["public"]["Enums"]["motivo_denuncia"]
          obra_id?: string | null
          perfil_denunciado_id?: string | null
          resolucion?: string | null
          resuelto_en?: string | null
          sala_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "denuncias_denunciante_id_fkey"
            columns: ["denunciante_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "denuncias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_perfil_denunciado_id_fkey"
            columns: ["perfil_denunciado_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      descartes: {
        Row: {
          creado_en: string
          id: string
          rol_id: string
          talento_id: string
        }
        Insert: {
          creado_en?: string
          id?: string
          rol_id: string
          talento_id: string
        }
        Update: {
          creado_en?: string
          id?: string
          rol_id?: string
          talento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "descartes_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["rol_id"]
          },
          {
            foreignKeyName: "descartes_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descartes_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["creador_id"]
          },
          {
            foreignKeyName: "descartes_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "perfiles_talento"
            referencedColumns: ["id"]
          },
        ]
      }
      descartes_equipo: {
        Row: {
          creado_en: string
          equipo_id: string
          talento_id: string
        }
        Insert: {
          creado_en?: string
          equipo_id: string
          talento_id: string
        }
        Update: {
          creado_en?: string
          equipo_id?: string
          talento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "descartes_equipo_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descartes_equipo_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          creador_id: string
          cupo: number | null
          descripcion: string | null
          id: string
          titulo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creador_id: string
          cupo?: number | null
          descripcion?: string | null
          id?: string
          titulo: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          creador_id?: string
          cupo?: number | null
          descripcion?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_equipo: {
        Row: {
          creado_en: string
          equipo_id: string
          id: string
          orden: number
          storage_path: string
        }
        Insert: {
          creado_en?: string
          equipo_id: string
          id?: string
          orden: number
          storage_path: string
        }
        Update: {
          creado_en?: string
          equipo_id?: string
          id?: string
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_equipo_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_obra: {
        Row: {
          creado_en: string
          id: string
          obra_id: string
          orden: number
          storage_path: string
        }
        Insert: {
          creado_en?: string
          id?: string
          obra_id: string
          orden: number
          storage_path: string
        }
        Update: {
          creado_en?: string
          id?: string
          obra_id?: string
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "fotos_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_talento: {
        Row: {
          creado_en: string
          id: string
          orden: number
          storage_path: string
          talento_id: string
        }
        Insert: {
          creado_en?: string
          id?: string
          orden: number
          storage_path: string
          talento_id: string
        }
        Update: {
          creado_en?: string
          id?: string
          orden?: number
          storage_path?: string
          talento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_talento_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["creador_id"]
          },
          {
            foreignKeyName: "fotos_talento_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "perfiles_talento"
            referencedColumns: ["id"]
          },
        ]
      }
      intereses_equipo: {
        Row: {
          a_perfil: string
          creado_en: string
          de_perfil: string
          equipo_id: string | null
          interesa: boolean
        }
        Insert: {
          a_perfil: string
          creado_en?: string
          de_perfil: string
          equipo_id?: string | null
          interesa: boolean
        }
        Update: {
          a_perfil?: string
          creado_en?: string
          de_perfil?: string
          equipo_id?: string | null
          interesa?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "intereses_equipo_a_perfil_fkey"
            columns: ["a_perfil"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_equipo_de_perfil_fkey"
            columns: ["de_perfil"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_equipo_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      intereses_match: {
        Row: {
          a_perfil: string
          creado_en: string
          de_perfil: string
          equipo_id: string | null
          id: string
          interesa: boolean
          obra_id: string | null
        }
        Insert: {
          a_perfil: string
          creado_en?: string
          de_perfil: string
          equipo_id?: string | null
          id?: string
          interesa: boolean
          obra_id?: string | null
        }
        Update: {
          a_perfil?: string
          creado_en?: string
          de_perfil?: string
          equipo_id?: string | null
          id?: string
          interesa?: boolean
          obra_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intereses_match_a_perfil_fkey"
            columns: ["a_perfil"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_match_de_perfil_fkey"
            columns: ["de_perfil"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_match_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_match_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "intereses_match_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          creado_en: string
          creado_por: string | null
          email: string
          id: string
          usado_en: string | null
          usado_por: string | null
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          email: string
          id?: string
          usado_en?: string | null
          usado_por?: string | null
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          email?: string
          id?: string
          usado_en?: string | null
          usado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_usado_por_fkey"
            columns: ["usado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          aceptado_en: string | null
          creado_en: string
          creador_id: string
          descartado_en: string | null
          equipo_id: string | null
          expira_en: string
          id: string
          mostrado_en: string | null
          obra_id: string | null
          talento_id: string
        }
        Insert: {
          aceptado_en?: string | null
          creado_en?: string
          creador_id: string
          descartado_en?: string | null
          equipo_id?: string | null
          expira_en?: string
          id?: string
          mostrado_en?: string | null
          obra_id?: string | null
          talento_id: string
        }
        Update: {
          aceptado_en?: string | null
          creado_en?: string
          creador_id?: string
          descartado_en?: string | null
          equipo_id?: string | null
          expira_en?: string
          id?: string
          mostrado_en?: string | null
          obra_id?: string | null
          talento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "matches_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          autor_id: string
          contenido: string
          creado_en: string
          id: string
          sala_id: string
        }
        Insert: {
          autor_id: string
          contenido: string
          creado_en?: string
          id?: string
          sala_id: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          creado_en?: string
          id?: string
          sala_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_contacto: {
        Row: {
          creado_en: string
          email: string
          id: string
          leido_en: string | null
          mensaje: string
          nombre: string
          tipo: string
        }
        Insert: {
          creado_en?: string
          email: string
          id?: string
          leido_en?: string | null
          mensaje: string
          nombre: string
          tipo: string
        }
        Update: {
          creado_en?: string
          email?: string
          id?: string
          leido_en?: string | null
          mensaje?: string
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          creado_en: string
          de_perfil: string | null
          destinatario_id: string
          id: string
          leida_en: string | null
          mail_enviado_en: string | null
          obra_id: string | null
          push_enviado_en: string | null
          rol_id: string | null
          sala_id: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Insert: {
          creado_en?: string
          de_perfil?: string | null
          destinatario_id: string
          id?: string
          leida_en?: string | null
          mail_enviado_en?: string | null
          obra_id?: string | null
          push_enviado_en?: string | null
          rol_id?: string | null
          sala_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Update: {
          creado_en?: string
          de_perfil?: string | null
          destinatario_id?: string
          id?: string
          leida_en?: string | null
          mail_enviado_en?: string | null
          obra_id?: string | null
          push_enviado_en?: string | null
          rol_id?: string | null
          sala_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_de_perfil_fkey"
            columns: ["de_perfil"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "notificaciones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["rol_id"]
          },
          {
            foreignKeyName: "notificaciones_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_sala_fk"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          actualizado_en: string
          creado_en: string
          creador_id: string
          estado: Database["public"]["Enums"]["estado_obra"]
          fecha_estreno_estimada: string | null
          id: string
          sinopsis: string | null
          titulo: string
          ubicacion_lat: number
          ubicacion_lng: number
          ubicacion_pais: string
          ubicacion_place_id: string | null
          ubicacion_publica: string | null
          ubicacion_texto: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creador_id: string
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_estreno_estimada?: string | null
          id?: string
          sinopsis?: string | null
          titulo: string
          ubicacion_lat: number
          ubicacion_lng: number
          ubicacion_pais: string
          ubicacion_place_id?: string | null
          ubicacion_publica?: string | null
          ubicacion_texto: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creador_id?: string
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_estreno_estimada?: string | null
          id?: string
          sinopsis?: string | null
          titulo?: string
          ubicacion_lat?: number
          ubicacion_lng?: number
          ubicacion_pais?: string
          ubicacion_place_id?: string | null
          ubicacion_publica?: string | null
          ubicacion_texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "perfiles_creador"
            referencedColumns: ["id"]
          },
        ]
      }
      obras_previas: {
        Row: {
          anio: number
          creado_en: string
          creador_id: string
          id: string
          rol_desempenado: string
          titulo: string
        }
        Insert: {
          anio: number
          creado_en?: string
          creador_id: string
          id?: string
          rol_desempenado: string
          titulo: string
        }
        Update: {
          anio?: number
          creado_en?: string
          creador_id?: string
          id?: string
          rol_desempenado?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_previas_creador_id_fkey"
            columns: ["creador_id"]
            isOneToOne: false
            referencedRelation: "perfiles_creador"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          aprobado_en: string | null
          bienvenida_enviada_en: string | null
          busca_equipo: boolean
          convocatorias_vistas_en: string
          creado_en: string
          discord_user_id: string | null
          discord_usuario: string | null
          enlace_publico_activo: boolean
          enlace_token: string
          es_admin: boolean
          id: string
          idioma: string
          modo_activo: Database["public"]["Enums"]["rol_usuario"] | null
          normas_aceptadas_en: string | null
          onboarding_completo: boolean
          pitch: string | null
          rol: Database["public"]["Enums"]["rol_usuario"] | null
          suspendido_en: string | null
          tema: string
          tour_creador_visto_en: string | null
          tour_talento_visto_en: string | null
        }
        Insert: {
          aprobado_en?: string | null
          bienvenida_enviada_en?: string | null
          busca_equipo?: boolean
          convocatorias_vistas_en?: string
          creado_en?: string
          discord_user_id?: string | null
          discord_usuario?: string | null
          enlace_publico_activo?: boolean
          enlace_token?: string
          es_admin?: boolean
          id: string
          idioma?: string
          modo_activo?: Database["public"]["Enums"]["rol_usuario"] | null
          normas_aceptadas_en?: string | null
          onboarding_completo?: boolean
          pitch?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"] | null
          suspendido_en?: string | null
          tema?: string
          tour_creador_visto_en?: string | null
          tour_talento_visto_en?: string | null
        }
        Update: {
          aprobado_en?: string | null
          bienvenida_enviada_en?: string | null
          busca_equipo?: boolean
          convocatorias_vistas_en?: string
          creado_en?: string
          discord_user_id?: string | null
          discord_usuario?: string | null
          enlace_publico_activo?: boolean
          enlace_token?: string
          es_admin?: boolean
          id?: string
          idioma?: string
          modo_activo?: Database["public"]["Enums"]["rol_usuario"] | null
          normas_aceptadas_en?: string | null
          onboarding_completo?: boolean
          pitch?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"] | null
          suspendido_en?: string | null
          tema?: string
          tour_creador_visto_en?: string | null
          tour_talento_visto_en?: string | null
        }
        Relationships: []
      }
      perfiles_creador: {
        Row: {
          actualizado_en: string
          disciplinas: Database["public"]["Enums"]["disciplina_artistica"][]
          id: string
          otro_detalle: string | null
        }
        Insert: {
          actualizado_en?: string
          disciplinas?: Database["public"]["Enums"]["disciplina_artistica"][]
          id: string
          otro_detalle?: string | null
        }
        Update: {
          actualizado_en?: string
          disciplinas?: Database["public"]["Enums"]["disciplina_artistica"][]
          id?: string
          otro_detalle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_creador_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_talento: {
        Row: {
          actualizado_en: string
          aparece_en_buscador: boolean
          edad_visible: boolean
          experiencia: string | null
          fecha_nacimiento: string | null
          genero: Database["public"]["Enums"]["genero_persona"]
          genero_descripcion: string | null
          habilidades: string[]
          id: string
          nombre: string
          onboarding_visto_en: string | null
          radio_busqueda_metros: number | null
          redes: Json
          ubicacion_lat: number
          ubicacion_lng: number
          ubicacion_pais: string
          ubicacion_place_id: string | null
          ubicacion_publica: string | null
          ubicacion_texto: string
          unidad_distancia: Database["public"]["Enums"]["unidad_distancia"]
          videoreel_url: string | null
        }
        Insert: {
          actualizado_en?: string
          aparece_en_buscador?: boolean
          edad_visible?: boolean
          experiencia?: string | null
          fecha_nacimiento?: string | null
          genero: Database["public"]["Enums"]["genero_persona"]
          genero_descripcion?: string | null
          habilidades?: string[]
          id: string
          nombre: string
          onboarding_visto_en?: string | null
          radio_busqueda_metros?: number | null
          redes?: Json
          ubicacion_lat: number
          ubicacion_lng: number
          ubicacion_pais: string
          ubicacion_place_id?: string | null
          ubicacion_publica?: string | null
          ubicacion_texto: string
          unidad_distancia?: Database["public"]["Enums"]["unidad_distancia"]
          videoreel_url?: string | null
        }
        Update: {
          actualizado_en?: string
          aparece_en_buscador?: boolean
          edad_visible?: boolean
          experiencia?: string | null
          fecha_nacimiento?: string | null
          genero?: Database["public"]["Enums"]["genero_persona"]
          genero_descripcion?: string | null
          habilidades?: string[]
          id?: string
          nombre?: string
          onboarding_visto_en?: string | null
          radio_busqueda_metros?: number | null
          redes?: Json
          ubicacion_lat?: number
          ubicacion_lng?: number
          ubicacion_pais?: string
          ubicacion_place_id?: string | null
          ubicacion_publica?: string | null
          ubicacion_texto?: string
          unidad_distancia?: Database["public"]["Enums"]["unidad_distancia"]
          videoreel_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_talento_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      postulaciones: {
        Row: {
          actualizado_en: string
          convocado_en: string | null
          creado_en: string
          estado: Database["public"]["Enums"]["estado_postulacion"]
          id: string
          rol_id: string
          talento_id: string
        }
        Insert: {
          actualizado_en?: string
          convocado_en?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          rol_id: string
          talento_id: string
        }
        Update: {
          actualizado_en?: string
          convocado_en?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          rol_id?: string
          talento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["rol_id"]
          },
          {
            foreignKeyName: "postulaciones_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["creador_id"]
          },
          {
            foreignKeyName: "postulaciones_talento_id_fkey"
            columns: ["talento_id"]
            isOneToOne: false
            referencedRelation: "perfiles_talento"
            referencedColumns: ["id"]
          },
        ]
      }
      push_suscripciones: {
        Row: {
          auth: string
          creado_en: string
          endpoint: string
          id: string
          p256dh: string
          perfil_id: string
        }
        Insert: {
          auth: string
          creado_en?: string
          endpoint: string
          id?: string
          p256dh: string
          perfil_id: string
        }
        Update: {
          auth?: string
          creado_en?: string
          endpoint?: string
          id?: string
          p256dh?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_suscripciones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          creado_en: string
          descripcion: string | null
          edad_maxima: number | null
          edad_minima: number | null
          generos_buscados: Database["public"]["Enums"]["genero_persona"][]
          id: string
          nombre: string
          obra_id: string
          tipo: Database["public"]["Enums"]["tipo_rol"]
          vacantes: number
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          edad_maxima?: number | null
          edad_minima?: number | null
          generos_buscados?: Database["public"]["Enums"]["genero_persona"][]
          id?: string
          nombre: string
          obra_id: string
          tipo: Database["public"]["Enums"]["tipo_rol"]
          vacantes: number
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          edad_maxima?: number | null
          edad_minima?: number | null
          generos_buscados?: Database["public"]["Enums"]["genero_persona"][]
          id?: string
          nombre?: string
          obra_id?: string
          tipo?: Database["public"]["Enums"]["tipo_rol"]
          vacantes?: number
        }
        Relationships: [
          {
            foreignKeyName: "roles_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "roles_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      sala_integrantes: {
        Row: {
          incorporado_en: string
          leido_hasta: string | null
          perfil_id: string
          sala_id: string
        }
        Insert: {
          incorporado_en?: string
          leido_hasta?: string | null
          perfil_id: string
          sala_id: string
        }
        Update: {
          incorporado_en?: string
          leido_hasta?: string | null
          perfil_id?: string
          sala_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sala_integrantes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sala_integrantes_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      salas: {
        Row: {
          creado_en: string
          discord_canal_id: string | null
          discord_voz_id: string | null
          equipo_id: string | null
          id: string
          obra_id: string | null
          titulo: string | null
        }
        Insert: {
          creado_en?: string
          discord_canal_id?: string | null
          discord_voz_id?: string | null
          equipo_id?: string | null
          id?: string
          obra_id?: string | null
          titulo?: string | null
        }
        Update: {
          creado_en?: string
          discord_canal_id?: string | null
          discord_voz_id?: string | null
          equipo_id?: string | null
          id?: string
          obra_id?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salas_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "feed_talento"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "salas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          logo_url: string
          nivel: string
          nombre: string
          orden: number
          sitio_url: string | null
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id?: string
          logo_url: string
          nivel: string
          nombre: string
          orden?: number
          sitio_url?: string | null
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          logo_url?: string
          nivel?: string
          nombre?: string
          orden?: number
          sitio_url?: string | null
        }
        Relationships: []
      }
      usos_ia: {
        Row: {
          creado_en: string
          id: number
          perfil_id: string
        }
        Insert: {
          creado_en?: string
          id?: never
          perfil_id: string
        }
        Update: {
          creado_en?: string
          id?: never
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usos_ia_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feed_talento: {
        Row: {
          creador_foto_path: string | null
          creador_id: string | null
          creador_nombre: string | null
          edad_maxima: number | null
          edad_minima: number | null
          generos_buscados:
            | Database["public"]["Enums"]["genero_persona"][]
            | null
          obra_creado_en: string | null
          obra_fotos: string[] | null
          obra_id: string | null
          obra_sinopsis: string | null
          obra_titulo: string | null
          obra_ubicacion_lat: number | null
          obra_ubicacion_lng: number | null
          obra_ubicacion_pais: string | null
          obra_ubicacion_texto: string | null
          rol_descripcion: string | null
          rol_id: string | null
          rol_nombre: string | null
          rol_tipo: Database["public"]["Enums"]["tipo_rol"] | null
          vacantes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_talento_id_fkey"
            columns: ["creador_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aceptados_iniciativa: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: number
      }
      aceptar_match: { Args: { p_match_id: string }; Returns: undefined }
      admin_aprobar_usuario: { Args: { p_id: string }; Returns: undefined }
      admin_bloqueos: {
        Args: { p_limite?: number; p_offset?: number }
        Returns: {
          creado_en: string
          creado_por: string
          motivo: string
          nombre_autor: string
          nombre_mayor: string
          nombre_menor: string
          perfil_mayor: string
          perfil_menor: string
        }[]
      }
      admin_borrar_sponsor: { Args: { p_id: string }; Returns: undefined }
      admin_crear_bloqueo: {
        Args: { p_a: string; p_b: string; p_motivo?: string }
        Returns: undefined
      }
      admin_crear_invitacion: { Args: { p_email: string }; Returns: undefined }
      admin_denuncias: {
        Args: { p_estado?: string; p_limite?: number; p_offset?: number }
        Returns: {
          creado_en: string
          denunciado: string
          denunciado_id: string
          denunciante: string
          detalle: string
          estado: string
          id: string
          motivo: string
          obra_titulo: string
          resolucion: string
          resuelto_en: string
        }[]
      }
      admin_guardar_sponsor: {
        Args: {
          p_activo: boolean
          p_id: string
          p_logo_url: string
          p_nivel: string
          p_nombre: string
          p_orden: number
          p_sitio_url: string
        }
        Returns: string
      }
      admin_invitaciones: {
        Args: { p_limite?: number; p_offset?: number }
        Returns: {
          creado_en: string
          email: string
          id: string
          usado_en: string
        }[]
      }
      admin_levantar_bloqueo: {
        Args: { p_mayor: string; p_menor: string }
        Returns: undefined
      }
      admin_marcar_mensaje_leido: {
        Args: { p_id: string; p_leido: boolean }
        Returns: undefined
      }
      admin_mensajes: {
        Args: { p_limite?: number; p_offset?: number }
        Returns: {
          creado_en: string
          email: string
          id: string
          leido: boolean
          mensaje: string
          nombre: string
          tipo: string
        }[]
      }
      admin_metricas: {
        Args: never
        Returns: {
          bloqueos: number
          con_ambos: number
          con_creador: number
          con_enlace_publico: number
          con_talento: number
          convocatorias_aceptadas: number
          denuncias_abiertas: number
          equipos_activos: number
          interes_7d: number
          matches_activos: number
          obras_publicadas: number
          registros_7d: number
          salas: number
          suspendidos: number
          total: number
        }[]
      }
      admin_publicaciones: {
        Args: { p_limite?: number; p_offset?: number; p_texto?: string }
        Returns: {
          creado_en: string
          creador_email: string
          creador_id: string
          creador_nombre: string
          detalle: string
          estado: string
          fotos: number
          id: string
          tipo: string
          titulo: string
        }[]
      }
      admin_resolver_denuncia: {
        Args: { p_estado: string; p_id: string; p_resolucion?: string }
        Returns: undefined
      }
      admin_solicitudes_pendientes: {
        Args: { p_limite?: number; p_offset?: number }
        Returns: {
          creado_en: string
          email: string
          id: string
        }[]
      }
      admin_sponsors: {
        Args: never
        Returns: {
          activo: boolean
          creado_en: string
          id: string
          logo_url: string
          nivel: string
          nombre: string
          orden: number
          sitio_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sponsors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_suspender_usuario: {
        Args: { p_id: string; p_suspender: boolean }
        Returns: undefined
      }
      admin_usuarios: {
        Args: { p_limite?: number; p_offset?: number; p_texto?: string }
        Returns: {
          creado_en: string
          email: string
          enlace_publico_activo: boolean
          enlace_token: string
          es_admin: boolean
          id: string
          modo_activo: string
          nombre: string
          roles: string[]
          suspendido: boolean
          ultimo_acceso: string
        }[]
      }
      buscar_talento: {
        Args: {
          p_edad_max?: number
          p_edad_min?: number
          p_equipo_id?: string
          p_generos?: Database["public"]["Enums"]["genero_persona"][]
          p_habilidades?: string[]
          p_lat?: number
          p_limite?: number
          p_lng?: number
          p_obra_id?: string
          p_offset?: number
          p_radio_metros?: number
          p_texto?: string
        }
        Returns: {
          edad: number
          foto_principal_path: string
          habilidades: string[]
          id: string
          nombre: string
          ubicacion_publica: string
        }[]
      }
      cobertura_iniciativa: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: {
          convocatoria_id: string
          rol_id: string
          rol_nombre: string
          talento_foto: string
          talento_id: string
          talento_nombre: string
          vacantes: number
        }[]
      }
      comparte_sala_con: { Args: { p_perfil_id: string }; Returns: boolean }
      consumir_uso_ia: { Args: never; Returns: number }
      contactar_desde_perfil: { Args: { p_token: string }; Returns: undefined }
      convocar: {
        Args: { p_match_id: string; p_rol_id?: string }
        Returns: undefined
      }
      creador_de_rol: { Args: { p_rol_id: string }; Returns: string }
      cupo_iniciativa: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: number
      }
      dar_de_baja_convocado: {
        Args: { p_convocatoria_id: string }
        Returns: undefined
      }
      descartar_convocado: { Args: { p_match_id: string }; Returns: undefined }
      deshacer_interes: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: undefined
      }
      desvincularme_de_sala: { Args: { p_sala_id: string }; Returns: undefined }
      devolver_uso_ia: { Args: { p_uso_id: number }; Returns: undefined }
      dias_para_reconfirmar: { Args: never; Returns: number }
      dias_para_vencer_espera: { Args: never; Returns: number }
      duenio_iniciativa: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: string
      }
      earth: { Args: never; Returns: number }
      edad_publica: { Args: { p_perfil: string }; Returns: number }
      enviar_mensaje_contacto: {
        Args: {
          p_email: string
          p_mensaje: string
          p_nombre: string
          p_tipo: string
        }
        Returns: undefined
      }
      es_admin: { Args: never; Returns: boolean }
      es_dueno_de_obra: { Args: { p_obra_id: string }; Returns: boolean }
      es_dueno_de_rol: { Args: { p_rol_id: string }; Returns: boolean }
      es_integrante_de_sala: { Args: { p_sala_id: string }; Returns: boolean }
      feed_equipo: {
        Args: { p_radio_metros?: number }
        Returns: {
          disciplinas: Database["public"]["Enums"]["disciplina_artistica"][]
          distancia_metros: number
          es_creador: boolean
          es_talento: boolean
          habilidades: string[]
          imagen_url: string
          nombre: string
          otro_detalle: string
          perfil_id: string
          pitch: string
          ubicacion_publica: string
        }[]
      }
      feed_equipos_para_talento: {
        Args: never
        Returns: {
          creado_en: string
          creador_foto_path: string
          creador_id: string
          creador_nombre: string
          cupo: number
          equipo_id: string
          fotos: string[]
          titulo: string
        }[]
      }
      feed_para_talento: {
        Args: { p_radio_metros?: number; p_talento_id: string }
        Returns: {
          creador_foto_path: string | null
          creador_id: string | null
          creador_nombre: string | null
          edad_maxima: number | null
          edad_minima: number | null
          generos_buscados:
            | Database["public"]["Enums"]["genero_persona"][]
            | null
          obra_creado_en: string | null
          obra_fotos: string[] | null
          obra_id: string | null
          obra_sinopsis: string | null
          obra_titulo: string | null
          obra_ubicacion_lat: number | null
          obra_ubicacion_lng: number | null
          obra_ubicacion_pais: string | null
          obra_ubicacion_texto: string | null
          rol_descripcion: string | null
          rol_id: string | null
          rol_nombre: string | null
          rol_tipo: Database["public"]["Enums"]["tipo_rol"] | null
          vacantes: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "feed_talento"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      hay_bloqueo: { Args: { p_otro_perfil: string }; Returns: boolean }
      hay_convocatorias_nuevas: { Args: never; Returns: boolean }
      iniciativa_en_cierre: {
        Args: { p_equipo_id: string; p_obra_id: string }
        Returns: boolean
      }
      marcar_convocatorias_vistas: { Args: never; Returns: undefined }
      marcar_interes: {
        Args: {
          p_a_perfil: string
          p_equipo_id: string
          p_interesa: boolean
          p_obra_id: string
        }
        Returns: undefined
      }
      marcar_match_mostrado: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      marcar_sala_leida: { Args: { p_sala_id: string }; Returns: undefined }
      me_contacto: { Args: { p_perfil: string }; Returns: boolean }
      metricas_obra: {
        Args: { p_obra_id: string }
        Returns: {
          alcance: number
          convocados: number
          cupo: number
          interes_recibido: number
          matches: number
        }[]
      }
      mi_perfil_talento: {
        Args: never
        Returns: {
          actualizado_en: string
          aparece_en_buscador: boolean
          edad_visible: boolean
          experiencia: string | null
          fecha_nacimiento: string | null
          genero: Database["public"]["Enums"]["genero_persona"]
          genero_descripcion: string | null
          habilidades: string[]
          id: string
          nombre: string
          onboarding_visto_en: string | null
          radio_busqueda_metros: number | null
          redes: Json
          ubicacion_lat: number
          ubicacion_lng: number
          ubicacion_pais: string
          ubicacion_place_id: string | null
          ubicacion_publica: string | null
          ubicacion_texto: string
          unidad_distancia: Database["public"]["Enums"]["unidad_distancia"]
          videoreel_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "perfiles_talento"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mis_convocados: {
        Args: never
        Returns: {
          convocatoria_id: string
          es_equipo: boolean
          estado: string
          foto_path: string
          iniciativa_foto: string
          iniciativa_titulo: string
          match_id: string
          nombre: string
          obra_id: string
          talento_id: string
        }[]
      }
      mis_convocatorias: {
        Args: never
        Returns: {
          convocatoria_id: string
          creado_en: string
          creador_nombre: string
          es_equipo: boolean
          iniciativa_foto: string
          iniciativa_titulo: string
          talento_foto: string
        }[]
      }
      mis_matches: {
        Args: never
        Returns: {
          cupo_lleno: boolean
          es_equipo: boolean
          expira_en: string
          foto_path: string
          iniciativa_foto: string
          iniciativa_titulo: string
          match_id: string
          mostrado_en: string
          nombre: string
          obra_id: string
          talento_id: string
        }[]
      }
      mis_matches_como_talento: {
        Args: never
        Returns: {
          convocatoria_id: string
          creador_nombre: string
          es_equipo: boolean
          estado: string
          expira_en: string
          iniciativa_foto: string
          iniciativa_titulo: string
          match_id: string
          obra_id: string
          sala_id: string
        }[]
      }
      nombre_de_perfil: { Args: { p_perfil_id: string }; Returns: string }
      perfil_oculto_a_nuevos: { Args: { p_perfil: string }; Returns: boolean }
      perfil_para_responder: {
        Args: { p_de: string }
        Returns: {
          disciplinas: Database["public"]["Enums"]["disciplina_artistica"][]
          es_creador: boolean
          es_talento: boolean
          habilidades: string[]
          nombre: string
          otro_detalle: string
          perfil_id: string
          pitch: string
          ubicacion_publica: string
        }[]
      }
      perfil_publico: {
        Args: { p_token: string }
        Returns: {
          disciplinas: Database["public"]["Enums"]["disciplina_artistica"][]
          edad: number
          fotos: string[]
          genero: string
          genero_descripcion: string
          habilidades: string[]
          nombre: string
          otro_detalle: string
          redes: Json
          texto: string
          ubicacion_publica: string
          videoreel_url: string
        }[]
      }
      puede_buscar_talento: { Args: never; Returns: boolean }
      responder_convocatoria: {
        Args: { p_aceptar: boolean; p_convocatoria_id: string }
        Returns: undefined
      }
      retirarme_de_match: { Args: { p_match_id: string }; Returns: undefined }
      salas_no_leidas: {
        Args: never
        Returns: {
          es_de_iniciativa: boolean
          es_dueno: boolean
          no_leidos: number
          sala_id: string
        }[]
      }
      talento_se_postulo_a_mis_obras: {
        Args: { p_talento_id: string }
        Returns: boolean
      }
      vencer_esperas: { Args: never; Returns: number }
    }
    Enums: {
      disciplina_artistica:
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
        | "otro"
      estado_convocatoria: "pendiente" | "aceptada" | "rechazada" | "baja"
      estado_denuncia: "abierta" | "en_revision" | "resuelta" | "descartada"
      estado_obra: "borrador" | "publicada" | "cerrada"
      estado_postulacion:
        | "pendiente"
        | "en_duda"
        | "aprobado"
        | "rechazado"
        | "esperando_confirmacion"
        | "vencida"
      genero_persona:
        | "mujer"
        | "varon"
        | "no_binarie"
        | "otro"
        | "sin_especificar"
      motivo_denuncia:
        | "acoso"
        | "discriminacion"
        | "perfil_falso"
        | "estafa"
        | "contenido_inapropiado"
        | "convocatoria_enganosa"
        | "otro"
      rol_usuario: "talento" | "creador"
      tipo_notificacion:
        | "match"
        | "sala_creada"
        | "convocado"
        | "espera_vencida"
        | "equipo_armado"
        | "interes_recibido"
        | "nuevo_match"
        | "solicitud_acceso"
        | "acceso_habilitado"
      tipo_rol: "actuacion" | "tecnica"
      unidad_distancia: "km" | "mi"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      disciplina_artistica: [
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
      ],
      estado_convocatoria: ["pendiente", "aceptada", "rechazada", "baja"],
      estado_denuncia: ["abierta", "en_revision", "resuelta", "descartada"],
      estado_obra: ["borrador", "publicada", "cerrada"],
      estado_postulacion: [
        "pendiente",
        "en_duda",
        "aprobado",
        "rechazado",
        "esperando_confirmacion",
        "vencida",
      ],
      genero_persona: [
        "mujer",
        "varon",
        "no_binarie",
        "otro",
        "sin_especificar",
      ],
      motivo_denuncia: [
        "acoso",
        "discriminacion",
        "perfil_falso",
        "estafa",
        "contenido_inapropiado",
        "convocatoria_enganosa",
        "otro",
      ],
      rol_usuario: ["talento", "creador"],
      tipo_notificacion: [
        "match",
        "sala_creada",
        "convocado",
        "espera_vencida",
        "equipo_armado",
        "interes_recibido",
        "nuevo_match",
        "solicitud_acceso",
        "acceso_habilitado",
      ],
      tipo_rol: ["actuacion", "tecnica"],
      unidad_distancia: ["km", "mi"],
    },
  },
} as const
