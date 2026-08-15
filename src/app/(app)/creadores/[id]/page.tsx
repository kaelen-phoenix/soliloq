import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resumenDisciplinas } from "@/lib/constantes";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";

export default async function PerfilCreadorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: creador }, { data: obrasPrevias }] = await Promise.all([
    supabase.from("perfiles_creador").select("*").eq("id", params.id).single(),
    supabase.from("obras_previas").select("*").eq("creador_id", params.id).order("anio", { ascending: false }),
  ]);

  if (!creador) notFound();

  return (
    <main className="px-5 py-5">
      <div className="flex items-center gap-4">
        {creador.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creador.imagen_url} alt={creador.nombre} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-ink-600">
            {creador.nombre[0]}
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
            {creador.nombre}
          </h1>
          <p className="text-sm text-ink-500">
            {resumenDisciplinas(creador.disciplinas, creador.otro_detalle)}
          </p>
          <p className="text-sm text-ink-400">{creador.ubicacion_publica}</p>
        </div>
      </div>

      {creador.descripcion && <p className="mt-4 max-w-prose text-sm text-ink-700">{creador.descripcion}</p>}

      {obrasPrevias && obrasPrevias.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Obras previas</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {obrasPrevias.map((o) => (
              <li key={o.id} className="rounded-xl border border-ink-100 px-4 py-2">
                <p className="font-medium text-ink-900">{o.titulo}</p>
                <p className="text-xs text-ink-500">
                  {o.anio} · {o.rol_desempenado}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <BotonDenuncia perfilDenunciadoId={creador.id} queSeDenuncia={`a ${creador.nombre}`} />
      </div>
    </main>
  );
}
