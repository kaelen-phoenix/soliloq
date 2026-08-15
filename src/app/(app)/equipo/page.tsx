import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedEquipo, type PersonaEquipo } from "@/components/equipo/feed-equipo";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export default async function EquipoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("busca_equipo")
    .eq("id", user.id)
    .single();

  // Es recíproco a propósito: si no aparecés, no ves. Un feed de personas donde se puede
  // mirar sin exponerse convierte a la otra mitad en catálogo.
  if (!perfil?.busca_equipo) {
    return (
      <main className="px-5 py-5">
        <EstadoVacio
          icono="perfil"
          titulo="Anotate para conocer gente"
          detalle="Acá aparecen personas que quieren armar algo sin tener todavía un proyecto. Para verlas tenés que aparecer vos también."
          accion={
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-900 hover:underline"
            >
              Activar en mi perfil
            </Link>
          }
        />
      </main>
    );
  }

  const { data } = await supabase.rpc("feed_equipo", { p_radio_metros: null });

  return (
    <main className="px-5 py-5">
      <FeedEquipo personasIniciales={(data ?? []) as PersonaEquipo[]} />
    </main>
  );
}
