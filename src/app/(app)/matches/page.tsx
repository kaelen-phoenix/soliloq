import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { MatchesLista } from "@/components/convocatorias/matches-lista";

export const metadata = { title: "Matches — Yalope" };

export default async function MatchesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (estado.modoActivo !== "creador") notFound();

  const { data: matches } = await supabase.rpc("mis_matches");

  const filas = (matches ?? []).map((m) => ({
    matchId: m.match_id,
    talentoId: m.talento_id,
    nombre: m.nombre,
    fotoUrl: m.foto_path
      ? supabase.storage.from("fotos-perfil").getPublicUrl(m.foto_path).data.publicUrl
      : null,
    expiraEn: m.expira_en,
    convocado: m.convocado,
    cupoLleno: m.cupo_lleno,
  }));

  return (
    <main className="px-5 py-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto sm:text-2xl">
        Matches
      </h1>
      <p className="mb-5 mt-1 text-sm text-texto-tenue">
        Personas con las que hubo interés mutuo. Tenés 7 días para convocarlas.
      </p>

      {filas.length === 0 ? (
        <EstadoVacio
          icono="corazon"
          titulo="Todavía no hay matches"
          detalle="Cuando marques «Me interesa» en un perfil y esa persona también marque tu proyecto o equipo, aparece acá."
        />
      ) : (
        <MatchesLista filas={filas} />
      )}
    </main>
  );
}
