import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioRol } from "@/components/convocatorias/formulario-rol";
import { AccionesObra } from "@/components/convocatorias/acciones-obra";
import { EditarObra } from "@/components/convocatorias/editar-obra";
import { FotosObra } from "@/components/convocatorias/fotos-obra";
import { MetricasObra } from "@/components/convocatorias/metricas-obra";
import { CoberturaIniciativa, type FilaCobertura } from "@/components/convocatorias/cobertura-iniciativa";
import { Icono } from "@/components/ui/icono";
import { etiquetaGenero } from "@/lib/constantes";

const ETIQUETA_TIPO: Record<string, string> = { actuacion: "Actuación", tecnica: "Técnica" };

export default async function DetalleObraPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { editar?: string };
}) {
  const supabase = createClient();

  const { data: obra } = await supabase.from("obras").select("*").eq("id", params.id).single();
  if (!obra) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const esDueno = user?.id === obra.creador_id;
  const editando = esDueno && searchParams.editar === "1";

  if (editando) {
    return (
      <main className="px-5 py-5">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-[-0.02em] text-texto">
          Editar proyecto
        </h2>
        <EditarObra obra={obra} />
      </main>
    );
  }

  const [{ data: roles }, { data: fotosRaw }, { data: coberturaRaw }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, nombre, tipo, edad_minima, edad_maxima, vacantes, generos_buscados")
      .eq("obra_id", params.id),
    supabase
      .from("fotos_obra")
      .select("id, storage_path, orden")
      .eq("obra_id", params.id)
      .order("orden"),
    // Sólo lectura del dueño: quién ocupa cada rol (#152). `cobertura_iniciativa` rechaza a
    // cualquier otra persona, así que ni se pide.
    esDueno
      ? supabase.rpc("cobertura_iniciativa", { p_obra_id: params.id, p_equipo_id: null })
      : Promise.resolve({ data: null }),
  ]);

  const cobertura: FilaCobertura[] = (coberturaRaw ?? []).map((r) => ({
    rolId: r.rol_id,
    rolNombre: r.rol_nombre,
    vacantes: r.vacantes,
    convocatoriaId: r.convocatoria_id,
    talentoId: r.talento_id,
    talentoNombre: r.talento_nombre,
    talentoFotoUrl: r.talento_foto
      ? supabase.storage.from("fotos-perfil").getPublicUrl(r.talento_foto).data.publicUrl
      : null,
  }));

  const fotos = (fotosRaw ?? []).map((f) => ({
    id: f.id,
    storage_path: f.storage_path,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
  }));

  return (
    <main className="px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-texto">
          {obra.titulo}
        </h2>
        {esDueno && (
          <Link
            href={`/obras/${obra.id}?editar=1`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil"
          >
            <Icono nombre="cambiar" className="h-3.5 w-3.5" />
            Editar
          </Link>
        )}
      </div>
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
        {roles && roles.length === 0 && (
          <>
            <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Roles</h3>
            <p className="text-sm text-texto-tenue">Todavía no definiste roles para esta obra.</p>
          </>
        )}

        {esDueno ? (
          // Quién ocupa cada rol y quién falta convocar (#152). El propio componente
          // pone su título ("Roles — X de Y cubiertos").
          <CoberturaIniciativa filas={cobertura} esEquipo={false} />
        ) : (
          roles &&
          roles.length > 0 && (
            <>
              <h3 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Roles</h3>
              <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
                {roles.map((rol) => (
                  <li key={rol.id} className="rounded-xl border border-borde bg-superficie p-4">
                    <p className="truncate text-base font-medium text-texto">{rol.nombre}</p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {ETIQUETA_TIPO[rol.tipo]}
                      {rol.edad_minima && rol.edad_maxima ? ` · ${rol.edad_minima}–${rol.edad_maxima} años` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {rol.generos_buscados.length === 0
                        ? "Abierto a cualquier género"
                        : rol.generos_buscados.map(etiquetaGenero).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )
        )}

        {esDueno && <FormularioRol obraId={obra.id} cantidadRoles={roles?.length ?? 0} />}
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
