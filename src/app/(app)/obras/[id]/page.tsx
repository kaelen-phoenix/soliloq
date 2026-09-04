import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioRol } from "@/components/convocatorias/formulario-rol";
import { AccionesObra } from "@/components/convocatorias/acciones-obra";
import { FotosObra } from "@/components/convocatorias/fotos-obra";
import { MetricasObra } from "@/components/convocatorias/metricas-obra";
import { etiquetaGenero } from "@/lib/constantes";

const ETIQUETA_TIPO: Record<string, string> = { actuacion: "Actuación", tecnica: "Técnica" };

export default async function DetalleObraPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: obra } = await supabase.from("obras").select("*").eq("id", params.id).single();
  if (!obra) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const esDueno = user?.id === obra.creador_id;

  const [{ data: roles }, { data: fotosRaw }] = await Promise.all([
    supabase
      .from("roles")
      .select(
        "id, nombre, tipo, edad_minima, edad_maxima, vacantes, generos_buscados, postulaciones(id, estado)"
      )
      .eq("obra_id", params.id),
    supabase
      .from("fotos_obra")
      .select("id, storage_path, orden")
      .eq("obra_id", params.id)
      .order("orden"),
  ]);

  const fotos = (fotosRaw ?? []).map((f) => ({
    id: f.id,
    storage_path: f.storage_path,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
  }));

  return (
    <main className="px-5 py-5">
      <h2 className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-texto">
        {obra.titulo}
      </h2>
      <p className="mt-1 text-sm text-texto-tenue">{obra.ubicacion_texto}</p>
      {obra.sinopsis && (
        <p className="mt-3 max-w-prose text-base leading-relaxed text-texto-tenue">{obra.sinopsis}</p>
      )}

      <div className="mt-5 max-w-2xl">
        <FotosObra obraId={obra.id} creadorId={obra.creador_id} fotosIniciales={fotos} />
      </div>

      <div className="mt-5">
        <AccionesObra
          obraId={obra.id}
          estado={obra.estado}
          cantidadRoles={roles?.length ?? 0}
          cantidadFotos={fotos.length}
          esDueno={esDueno}
          fotosPaths={fotos.map((f) => f.storage_path)}
        />
      </div>

      <section className="mt-7 flex flex-col gap-2.5">
        <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Roles</h3>

        {roles && roles.length === 0 && (
          <p className="text-sm text-texto-tenue">Todavía no definiste roles para esta obra.</p>
        )}

        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
          {roles?.map((rol) => {
            const aprobados = rol.postulaciones.filter((p: any) => p.estado === "aprobado").length;
            const sinRevisar = rol.postulaciones.filter((p: any) => p.estado === "pendiente").length;
            return (
              <li key={rol.id}>
                <Link
                  href={`/obras/${obra.id}/roles/${rol.id}`}
                  className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 transition-colors hover:border-borde"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-texto">{rol.nombre}</p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {ETIQUETA_TIPO[rol.tipo]}
                      {rol.edad_minima && rol.edad_maxima ? ` · ${rol.edad_minima}–${rol.edad_maxima} años` : ""}
                      {" · "}
                      {aprobados}/{rol.vacantes} cubiertas
                    </p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {rol.generos_buscados.length === 0
                        ? "Abierto a cualquier género"
                        : rol.generos_buscados.map(etiquetaGenero).join(", ")}
                    </p>
                  </div>
                  {sinRevisar > 0 && (
                    <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-2xs font-semibold text-white">
                      {sinRevisar}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <FormularioRol obraId={obra.id} cantidadRoles={roles?.length ?? 0} />
      </section>

      <section className="mt-8 flex flex-col gap-2.5">
        <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          Rendimiento
        </h3>
        <MetricasObra obraId={obra.id} />
      </section>
    </main>
  );
}
