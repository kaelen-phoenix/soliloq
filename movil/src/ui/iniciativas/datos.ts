import { filasCobertura, itemsTablero, type FilaCobertura, type ItemTablero } from "@/lib/iniciativa-reglas";
import { BUCKET_FOTOS } from "@/lib/perfil-talento";
import type { Genero } from "@/lib/constantes";
import type { EstadoObra, TipoRol } from "@/lib/supabase/types";
import { supabase } from "~/lib/supabase";
import type { FotoIniciativa } from "./fotos-iniciativa";
import type { ObraEditable } from "./formulario-obra";

/** Lo mismo que leen las páginas de la web (`/proyectos`, `/obras/[id]`, `/equipos/[id]`). */

const urlPublica = (ruta: string) => supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;

function conUrl(fotos: { id: string; storage_path: string; orden: number }[] | null): FotoIniciativa[] {
  return (fotos ?? [])
    .map((f) => ({ id: f.id, storage_path: f.storage_path, orden: f.orden, url: urlPublica(f.storage_path) }))
    .sort((a, b) => a.orden - b.orden);
}

export async function leerTablero(creadorId: string): Promise<ItemTablero[]> {
  const [{ data: obras }, { data: equipos }] = await Promise.all([
    supabase.from("obras").select("id, titulo, estado, creado_en").eq("creador_id", creadorId),
    supabase.from("equipos").select("id, titulo, activo, creado_en").eq("creador_id", creadorId),
  ]);
  return itemsTablero(obras ?? [], equipos ?? []);
}

export interface RolObra {
  id: string;
  nombre: string;
  tipo: TipoRol;
  edad_minima: number | null;
  edad_maxima: number | null;
  vacantes: number;
  generos_buscados: Genero[];
}

export interface DetalleObra {
  obra: ObraEditable & { creador_id: string; estado: EstadoObra };
  roles: RolObra[];
  fotos: FotoIniciativa[];
  /** Solo para el dueño: `cobertura_iniciativa` rechaza a cualquier otra persona (#152). */
  cobertura: FilaCobertura[];
}

export async function leerObra(obraId: string, userId: string | undefined): Promise<DetalleObra | null> {
  const { data: obra } = await supabase.from("obras").select("*").eq("id", obraId).maybeSingle();
  if (!obra) return null;
  const esDueno = userId === obra.creador_id;
  const [{ data: roles }, { data: fotos }, { data: cobertura }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, nombre, tipo, edad_minima, edad_maxima, vacantes, generos_buscados")
      .eq("obra_id", obraId),
    supabase.from("fotos_obra").select("id, storage_path, orden").eq("obra_id", obraId).order("orden"),
    esDueno
      ? supabase.rpc("cobertura_iniciativa", { p_obra_id: obraId, p_equipo_id: null })
      : Promise.resolve({ data: null }),
  ]);
  return {
    obra: obra as DetalleObra["obra"],
    roles: (roles ?? []) as RolObra[],
    fotos: conUrl(fotos),
    cobertura: filasCobertura(cobertura ?? [], urlPublica),
  };
}

export interface DetalleEquipo {
  equipo: { id: string; titulo: string; descripcion: string | null; cupo: number | null; activo: boolean; creador_id: string };
  fotos: FotoIniciativa[];
  cobertura: FilaCobertura[];
}

/** Solo el dueño ve la pantalla del Equipo (como en la web); para cualquier otra persona, `null`. */
export async function leerEquipo(equipoId: string, userId: string | undefined): Promise<DetalleEquipo | null> {
  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, titulo, descripcion, cupo, activo, creador_id, fotos_equipo(id, storage_path, orden)")
    .eq("id", equipoId)
    .maybeSingle();
  if (!equipo || equipo.creador_id !== userId) return null;
  const { data: cobertura } = await supabase.rpc("cobertura_iniciativa", { p_obra_id: null, p_equipo_id: equipo.id });
  const { fotos_equipo, ...resto } = equipo;
  return { equipo: resto, fotos: conUrl(fotos_equipo), cobertura: filasCobertura(cobertura ?? [], urlPublica) };
}
