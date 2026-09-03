import Link from "next/link";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { GestionEquipo } from "@/components/convocatorias/gestion-equipo";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: obras }, { data: equipo }] = await Promise.all([
    supabase
      .from("obras")
      .select("id, titulo, estado, roles(id, postulaciones(id, estado))")
      .eq("creador_id", creadorId)
      .order("creado_en", { ascending: false }),
    supabase
      .from("equipos")
      .select("id, titulo, cupo, activo, fotos_equipo(id, storage_path, orden)")
      .eq("creador_id", creadorId)
      .eq("activo", true)
      .maybeSingle(),
  ]);

  const tieneObraPublicada = (obras ?? []).some((o) => o.estado === "publicada");
  const hayEquipoActivo = equipo != null;

  const fotosEquipo = (equipo?.fotos_equipo ?? [])
    .map((f) => ({
      id: f.id,
      storage_path: f.storage_path,
      orden: f.orden,
      url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
    }))
    .sort((a, b) => a.orden - b.orden);

  const { data: interesadosRaw } = equipo
    ? await supabase.rpc("interesados_en_equipo", { p_equipo_id: equipo.id })
    : { data: null };

  const interesados = (interesadosRaw ?? []).map((i) => ({
    perfil_id: i.perfil_id,
    nombre: i.nombre,
    ubicacion_publica: i.ubicacion_publica,
    aceptado: i.aceptado,
    foto_url: i.foto_path
      ? supabase.storage.from("fotos-perfil").getPublicUrl(i.foto_path).data.publicUrl
      : null,
  }));

  return (
    <main className="px-5 py-5">
      {/* Un perfil de Creador lleva adelante una sola iniciativa: un proyecto (obra con
          roles) o un equipo (por cupo, sin roles). Ver issue #57. */}
      {!hayEquipoActivo && (
        <Link
          href="/obras/nueva"
          className="mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-accion px-4 py-3 text-sm font-medium text-accion-texto transition-colors hover:opacity-90"
        >
          <Icono nombre="mas" className="h-4 w-4" />
          Crear nueva obra
        </Link>
      )}

      <div className="mb-5">
        <GestionEquipo
          creadorId={creadorId}
          equipo={equipo ?? null}
          fotos={fotosEquipo}
          interesados={interesados}
          tieneObraPublicada={tieneObraPublicada}
        />
      </div>

      {!hayEquipoActivo && (!obras || obras.length === 0) && (
        <EstadoVacio
          icono="tablero"
          titulo="Todavía no creaste ninguna obra"
          detalle="Creá tu primera obra, definí los roles que buscás y publicala para empezar a recibir postulantes."
        />
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {obras?.map((obra) => {
          const pendientes = obra.roles.reduce(
            (acc: number, r: any) => acc + r.postulaciones.filter((p: any) => p.estado === "pendiente").length,
            0
          );
          return (
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
                {pendientes > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-2xs font-semibold text-white">
                    {pendientes}
                  </span>
                )}
                <Icono nombre="chevron" className="h-4 w-4 -rotate-90 text-texto-tenue" />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
