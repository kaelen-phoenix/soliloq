import Link from "next/link";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { GestionEquipo } from "@/components/convocatorias/gestion-equipo";
import { FormularioObra } from "@/components/convocatorias/formulario-obra";
import { PanelesIniciativa } from "@/components/convocatorias/paneles-iniciativa";
import type { FilaCobertura } from "@/components/convocatorias/cobertura-iniciativa";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  cerrada: "Cerrada",
};

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-texto-tenue",
  publicada: "bg-accion text-accion-texto",
  cerrada: "bg-fondo-sutil text-texto-tenue",
};

export async function TableroCreador({ creadorId }: { creadorId: string }) {
  const supabase = createClient();

  // #330: sin límites. Se pueden tener varios Proyectos y varios Equipos activos a la vez.
  const [{ data: obras }, { data: equipos }] = await Promise.all([
    supabase
      .from("obras")
      .select("id, titulo, estado")
      .eq("creador_id", creadorId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("equipos")
      .select("id, titulo, descripcion, cupo, activo, fotos_equipo(id, storage_path, orden)")
      .eq("creador_id", creadorId)
      .eq("activo", true)
      .order("creado_en", { ascending: false }),
  ]);

  const url = (path: string) => supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl;

  // Por cada Equipo, sus fotos y quién ya forma parte («Participantes», #152).
  const equiposConDatos = await Promise.all(
    (equipos ?? []).map(async (equipo) => {
      const { data: coberturaRaw, error } = await supabase.rpc("cobertura_iniciativa", {
        p_obra_id: null,
        p_equipo_id: equipo.id,
      });
      if (error) reportarErrorSupabase(error, { rpc: "cobertura_iniciativa", equipoId: equipo.id });
      const cobertura: FilaCobertura[] = (coberturaRaw ?? []).map((r) => ({
        rolId: r.rol_id,
        rolNombre: r.rol_nombre,
        vacantes: r.vacantes,
        convocatoriaId: r.convocatoria_id,
        talentoId: r.talento_id,
        talentoNombre: r.talento_nombre,
        talentoFotoUrl: r.talento_foto ? url(r.talento_foto) : null,
      }));
      const fotos = (equipo.fotos_equipo ?? [])
        .map((f) => ({ id: f.id, storage_path: f.storage_path, orden: f.orden, url: url(f.storage_path) }))
        .sort((x, y) => x.orden - y.orden);
      return { equipo, fotos, cobertura };
    }),
  );

  const panelProyecto = (
    <div className="flex flex-col gap-4">
      {/* #157: el mismo formulario inline que «Armar equipo»: título, descripción, ubicación y
          roles, todo antes de crear. */}
      <FormularioObra creadorId={creadorId} />

      {(!obras || obras.length === 0) && (
        <EstadoVacio
          icono="tablero"
          titulo="Todavía no creaste ningún proyecto"
          detalle="Creá tu proyecto, definí los roles que buscás y publicalo para que aparezca en Explorar."
        />
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
        {obras?.map((obra) => (
          <li key={obra.id}>
            <Link
              href={`/obras/${obra.id}`}
              className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 transition-colors hover:border-borde"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-texto">{obra.titulo}</p>
                <span
                  className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide ${COLOR_ESTADO[obra.estado]}`}
                >
                  {ETIQUETA_ESTADO[obra.estado]}
                </span>
              </div>
              <Icono nombre="chevron" className="h-4 w-4 -rotate-90 text-texto-tenue" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  const panelEquipo = (
    <div className="flex flex-col gap-4">
      {/* Primero el formulario para armar otro; después los que ya están armados. */}
      <GestionEquipo creadorId={creadorId} equipo={null} fotos={[]} cobertura={[]} />
      {equiposConDatos.map(({ equipo, fotos, cobertura }) => (
        <GestionEquipo key={equipo.id} creadorId={creadorId} equipo={equipo} fotos={fotos} cobertura={cobertura} />
      ))}
    </div>
  );

  return (
    <main className="px-5 py-5">
      {/* #294: «Buscar talento» vive dentro de cada Proyecto y en el panel del Equipo —se
          busca para algo concreto—, no arriba de todo. */}
      <PanelesIniciativa
        modoInicial={(obras ?? []).length === 0 && equiposConDatos.length > 0 ? "equipo" : "proyecto"}
        panelProyecto={panelProyecto}
        panelEquipo={panelEquipo}
      />
    </main>
  );
}
