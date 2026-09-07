import { redirect } from "next/navigation";
import { BuscadorTalento } from "@/components/talento/buscador-talento";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { createClient } from "@/lib/supabase/server";

/**
 * Buscador de talento: la única superficie donde el creador sale a buscar gente por
 * iniciativa propia. Gateada al modo creador —un talento acá no tiene nada que hacer y
 * además la RLS no le daría resultados.
 */
export default async function BuscarTalentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (estado.modoActivo !== "creador") redirect("/");

  // Para el swipe (#124): a qué iniciativa se marca el interés, y su foto para la placa.
  const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);
  let iniciativaFoto: string | null = null;
  if (iniciativa?.tipo === "obra") {
    const { data } = await supabase
      .from("fotos_obra")
      .select("storage_path")
      .eq("obra_id", iniciativa.id)
      .order("orden")
      .limit(1)
      .maybeSingle();
    iniciativaFoto = data?.storage_path
      ? supabase.storage.from("fotos-perfil").getPublicUrl(data.storage_path).data.publicUrl
      : null;
  } else if (iniciativa?.tipo === "equipo") {
    const { data } = await supabase
      .from("fotos_equipo")
      .select("storage_path")
      .eq("equipo_id", iniciativa.id)
      .order("orden")
      .limit(1)
      .maybeSingle();
    iniciativaFoto = data?.storage_path
      ? supabase.storage.from("fotos-perfil").getPublicUrl(data.storage_path).data.publicUrl
      : null;
  }

  return (
    <main className="px-5 py-5">
      {/* El título lo pone el encabezado (titulo-seccion). Acá va solo la bajada. */}
      <p className="mb-5 text-sm text-texto-tenue">
        Encontrá artistas por nombre, habilidad o experiencia, y filtrá por edad, género o zona.
      </p>
      <BuscadorTalento
        iniciativa={
          iniciativa ? { titulo: iniciativa.titulo, fotoUrl: iniciativaFoto } : null
        }
      />
    </main>
  );
}
