import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocatoriasLista } from "@/components/talento/convocatorias-lista";

export const metadata = { title: "Convocado — Yalope" };

export default async function ConvocadoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: convocatorias } = await supabase.rpc("mis_convocatorias");

  const filas = (convocatorias ?? []).map((c) => ({
    convocatoriaId: c.convocatoria_id,
    titulo: c.titulo,
    creadorNombre: c.creador_nombre,
    esEquipo: c.es_equipo,
  }));

  return (
    <main className="px-5 py-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto sm:text-2xl">
        Convocado
      </h1>
      <p className="mb-5 mt-1 text-sm text-texto-tenue">
        Proyectos y equipos que te convocaron. Al aceptar entrás a la sala.
      </p>

      {filas.length === 0 ? (
        <EstadoVacio
          icono="corazon"
          titulo="Todavía no te convocaron"
          detalle="Cuando marques «Me interesa» en un proyecto o equipo y esa persona también te elija, puede convocarte. Va a aparecer acá."
        />
      ) : (
        <ConvocatoriasLista filas={filas} />
      )}
    </main>
  );
}
