import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioRol } from "@/components/convocatorias/formulario-rol";
import { AccionesObra } from "@/components/convocatorias/acciones-obra";

const ETIQUETA_TIPO: Record<string, string> = { actuacion: "Actuación", tecnica: "Técnica" };

export default async function DetalleObraPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: obra } = await supabase.from("obras").select("*").eq("id", params.id).single();
  if (!obra) notFound();

  const { data: roles } = await supabase
    .from("roles")
    .select("id, nombre, tipo, edad_minima, edad_maxima, vacantes, postulaciones(id, estado)")
    .eq("obra_id", params.id);

  return (
    <main className="px-6 py-6">
      <h1 className="text-xl font-bold text-ink-900">{obra.titulo}</h1>
      <p className="mt-1 text-sm text-ink-500">{obra.locacion_ensayos}</p>
      {obra.sinopsis && <p className="mt-3 text-sm text-ink-700">{obra.sinopsis}</p>}

      <div className="mt-4">
        <AccionesObra obraId={obra.id} estado={obra.estado} cantidadRoles={roles?.length ?? 0} />
      </div>

      <section className="mt-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Roles</h2>

        {roles && roles.length === 0 && (
          <p className="text-sm text-ink-500">Todavía no definiste roles para esta obra.</p>
        )}

        <ul className="flex flex-col gap-2">
          {roles?.map((rol) => {
            const aprobados = rol.postulaciones.filter((p: any) => p.estado === "aprobado").length;
            const sinRevisar = rol.postulaciones.filter((p: any) => p.estado === "pendiente").length;
            return (
              <li key={rol.id}>
                <Link
                  href={`/obras/${obra.id}/roles/${rol.id}`}
                  className="flex items-center justify-between rounded-card border border-ink-100 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-ink-900">{rol.nombre}</p>
                    <p className="text-xs text-ink-500">
                      {ETIQUETA_TIPO[rol.tipo]}
                      {rol.edad_minima && rol.edad_maxima ? ` · ${rol.edad_minima}-${rol.edad_maxima} años` : ""}
                      {" · "}
                      {aprobados}/{rol.vacantes} vacantes cubiertas
                    </p>
                  </div>
                  {sinRevisar > 0 && (
                    <span className="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
                      {sinRevisar}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <FormularioRol obraId={obra.id} />
      </section>
    </main>
  );
}
