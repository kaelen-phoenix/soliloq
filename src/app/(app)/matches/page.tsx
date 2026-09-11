import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { MatchesLista } from "@/components/convocatorias/matches-lista";
import { ConvocadosLista } from "@/components/convocatorias/convocados-lista";

export const metadata = { title: "Call Back — Yalope" };

export default async function MatchesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (estado.modoActivo !== "creador") notFound();

  const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);

  const [{ data: matches }, { data: convocados }, { data: cobertura }] = await Promise.all([
    supabase.rpc("mis_matches"),
    supabase.rpc("mis_convocados"),
    // Roles del Proyecto activo, para elegir a cuál queda asociado al convocar en firme
    // (#152). Un Equipo no tiene roles: no hace falta elegir nada.
    iniciativa?.tipo === "obra"
      ? supabase.rpc("cobertura_iniciativa", { p_obra_id: iniciativa.id, p_equipo_id: null })
      : Promise.resolve({ data: null }),
  ]);

  const url = (path: string | null) =>
    path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;

  // Un rol ya cubierto (todas sus vacantes con convocatoria pendiente o aceptada) no se
  // puede elegir de nuevo al convocar.
  const roles = cobertura
    ? [...new Map(cobertura.filter((r) => r.rol_id).map((r) => [r.rol_id, r])).values()].map((r) => ({
        id: r.rol_id as string,
        nombre: r.rol_nombre as string,
        disponible:
          cobertura.filter((x) => x.rol_id === r.rol_id && x.talento_id).length < r.vacantes,
      }))
    : null;

  const filas = (matches ?? []).map((m) => ({
    matchId: m.match_id,
    talentoId: m.talento_id,
    nombre: m.nombre,
    fotoUrl: url(m.foto_path),
    expiraEn: m.expira_en,
    esEquipo: m.es_equipo,
    iniciativaTitulo: m.iniciativa_titulo,
    iniciativaFotoUrl: url(m.iniciativa_foto),
    cupoLleno: m.cupo_lleno,
  }));

  const filasConvocados = (convocados ?? []).map((c) => ({
    matchId: c.match_id,
    convocatoriaId: c.convocatoria_id,
    talentoId: c.talento_id,
    nombre: c.nombre,
    fotoUrl: url(c.foto_path),
    esEquipo: c.es_equipo,
    iniciativaTitulo: c.iniciativa_titulo,
    estado: c.estado as "en_convocados" | "esperando_confirmacion" | "en_sala",
  }));

  return (
    <main className="px-5 py-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-texto sm:text-2xl">
        Call Back
      </h1>
      <p className="mb-5 mt-1 text-sm text-texto-tenue">
        Interés mutuo. Aceptá el match para sumar a la persona a Convocados; después la
        convocás en firme.
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

      <ConvocadosLista filas={filasConvocados} roles={roles} />
    </main>
  );
}
