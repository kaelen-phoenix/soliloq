import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EtiquetasDisciplina } from "@/components/perfil/etiquetas-disciplina";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";
import { Imagen } from "@/components/ui/imagen";

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
          <Imagen
            src={creador.imagen_url}
            alt={creador.nombre}
            width={64}
            height={64}
            contenedorClassName="shrink-0 rounded-full"
            fallback={
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
                {creador.nombre[0]}
              </div>
            }
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
            {creador.nombre[0]}
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto">
            {creador.nombre}
          </h1>
          <EtiquetasDisciplina
            disciplinas={creador.disciplinas}
            otroDetalle={creador.otro_detalle}
            className="mt-1.5"
          />
          <p className="text-sm text-texto-tenue">{creador.ubicacion_publica}</p>
        </div>
      </div>

      {creador.descripcion && <p className="mt-4 max-w-prose text-sm text-texto">{creador.descripcion}</p>}

      {obrasPrevias && obrasPrevias.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Obras previas</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {obrasPrevias.map((o) => (
              <li key={o.id} className="rounded-xl border border-borde px-4 py-2">
                <p className="font-medium text-texto">{o.titulo}</p>
                <p className="text-xs text-texto-tenue">
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
