import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import { InteresEnTalento } from "@/components/talento/interes-en-talento";

export default async function PerfilTalentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: talento }, { data: fotos }] = await Promise.all([
    supabase.from("perfiles_talento").select("*").eq("id", params.id).single(),
    supabase.from("fotos_talento").select("*").eq("talento_id", params.id).order("orden"),
  ]);

  if (!talento) notFound();

  const fotosConUrl = (fotos ?? []).map((f) => ({
    id: f.id,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
  }));

  // El bloque de "Me interesa" solo para el Creador mirando un talento que no es él.
  let interes: React.ReactNode = null;
  if (user && user.id !== talento.id) {
    const estado = await leerEstadoCuenta(supabase, user.id);
    if (estado.modoActivo === "creador") {
      const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);
      let interesInicial: boolean | null = null;
      if (iniciativa) {
        const columna = iniciativa.tipo === "obra" ? "obra_id" : "equipo_id";
        const { data: fila } = await supabase
          .from("intereses_match")
          .select("interesa")
          .eq("de_perfil", user.id)
          .eq("a_perfil", talento.id)
          .eq(columna, iniciativa.id)
          .maybeSingle();
        interesInicial = fila?.interesa ?? null;
      }
      interes = (
        <InteresEnTalento
          talentoId={talento.id}
          tituloIniciativa={iniciativa?.titulo ?? null}
          interesInicial={interesInicial}
        />
      );
    }
  }

  return (
    <main className="px-5 py-5">
      <PerfilTalentoDetalle talento={{ ...talento, fotos: fotosConUrl }} />

      {interes && <div className="mt-6 max-w-lg">{interes}</div>}

      <div className="mt-8">
        <BotonDenuncia perfilDenunciadoId={talento.id} queSeDenuncia={`a ${talento.nombre}`} />
      </div>
    </main>
  );
}
