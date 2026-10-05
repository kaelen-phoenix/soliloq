import { redirect } from "next/navigation";
import { BuscadorTalento } from "@/components/talento/buscador-talento";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { iniciativaParaBuscar } from "@/lib/iniciativa-servidor";
import { createClient } from "@/lib/supabase/server";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

/**
 * Buscador de talento: la única superficie donde el creador sale a buscar gente por
 * iniciativa propia. Se entra desde un Proyecto o un Equipo (#294): busca para ese
 * (`?obra=…` / `?equipo=…`). Sin nada armado no hay para qué buscar: se manda a armarlo.
 */
export default async function BuscarTalentoPage({
  searchParams,
}: {
  searchParams: { obra?: string; equipo?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("proyectos.talentos");
  const user = await usuarioDeLaRequest();
  if (!user) redirect("/ingresar");

  // Para el swipe (#124): a qué iniciativa se marca el interés, y su foto para la placa.
  const iniciativa = await iniciativaParaBuscar(supabase, user.id, searchParams);
  if (!iniciativa) {
    return (
      <main className="px-5 py-5">
        <EstadoVacio
          icono="buscar"
          titulo={t("sinIniciativaTitulo")}
          detalle={t("sinIniciativaDetalle")}
          accion={
            <Link
              href="/proyectos"
              className="inline-flex items-center rounded-full bg-accion px-4 py-2 text-sm font-semibold text-accion-texto"
            >
              {t("irAMisProyectos")}
            </Link>
          }
        />
      </main>
    );
  }
  let iniciativaFoto: string | null = null;
  if (iniciativa.tipo === "obra") {
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
  } else {
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
        {t.rich("bajada", {
          titulo: iniciativa.titulo,
          b: (chunks) => <span className="font-medium text-texto">{chunks}</span>,
        })}
      </p>
      <BuscadorTalento
        iniciativa={{
          tipo: iniciativa.tipo,
          id: iniciativa.id,
          titulo: iniciativa.titulo,
          fotoUrl: iniciativaFoto,
        }}
      />
    </main>
  );
}
