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
    <main className="px-5 py-5">
      <h2 className="text-[20px] font-semibold leading-tight text-ink-900">{obra.titulo}</h2>
      <p className="mt-1 text-[13px] text-ink-500">{obra.locacion_ensayos}</p>
      {obra.sinopsis && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{obra.sinopsis}</p>
      )}

      <div className="mt-5">
        <AccionesObra obraId={obra.id} estado={obra.estado} cantidadRoles={roles?.length ?? 0} />
      </div>

      <section className="mt-7 flex flex-col gap-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Roles</h3>

        {roles && roles.length === 0 && (
          <p className="text-[13px] text-ink-500">Todavía no definiste roles para esta obra.</p>
        )}

        <ul className="flex flex-col gap-2">
          {roles?.map((rol) => {
            const aprobados = rol.postulaciones.filter((p: any) => p.estado === "aprobado").length;
            const sinRevisar = rol.postulaciones.filter((p: any) => p.estado === "pendiente").length;
            return (
              <li key={rol.id}>
                <Link
                  href={`/obras/${obra.id}/roles/${rol.id}`}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 transition-colors hover:border-ink-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink-900">{rol.nombre}</p>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      {ETIQUETA_TIPO[rol.tipo]}
                      {rol.edad_minima && rol.edad_maxima ? ` · ${rol.edad_minima}–${rol.edad_maxima} años` : ""}
                      {" · "}
                      {aprobados}/{rol.vacantes} cubiertas
                    </p>
                  </div>
                  {sinRevisar > 0 && (
                    <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
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
