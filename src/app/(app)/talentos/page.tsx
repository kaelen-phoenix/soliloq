import { redirect } from "next/navigation";
import { BuscadorTalento } from "@/components/talento/buscador-talento";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
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

  return (
    <main className="px-5 py-5">
      {/* El título lo pone el encabezado (titulo-seccion). Acá va solo la bajada. */}
      <p className="mb-5 text-sm text-texto-tenue">
        Encontrá artistas por nombre, habilidad o experiencia, y filtrá por edad, género o zona.
      </p>
      <BuscadorTalento />
    </main>
  );
}
