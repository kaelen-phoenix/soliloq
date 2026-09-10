import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ConvocatoriasLista } from "@/components/talento/convocatorias-lista";

export const metadata = { title: "Convocatoria — Yalope" };

export default async function ConvocatoriaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("mis_convocatorias");

  const url = (p: string | null) =>
    p ? supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl : null;

  const filas = (data ?? []).map((c) => ({
    convocatoriaId: c.convocatoria_id,
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    creadorNombre: c.creador_nombre,
    talentoFotoUrl: url(c.talento_foto),
    iniciativaFotoUrl: url(c.iniciativa_foto),
  }));

  return (
    <main className="px-5 py-5">
      <h1 className="mb-1 font-display text-xl font-semibold tracking-[-0.02em] text-texto sm:text-2xl">
        Convocatoria
      </h1>
      <p className="mb-5 text-sm text-texto-tenue">
        Te convocaron a un proyecto o equipo. Aceptá para entrar a la sala.
      </p>

      {filas.length === 0 ? (
        <EstadoVacio
          icono="corazon"
          titulo="No tenés convocatorias pendientes"
          detalle="Cuando un creador te convoque en firme, la vas a ver acá."
        />
      ) : (
        <ConvocatoriasLista filas={filas} />
      )}
    </main>
  );
}
