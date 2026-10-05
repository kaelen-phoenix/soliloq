import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export async function MetricasObra({ obraId }: { obraId: string }) {
  const supabase = createClient();
  const t = await getTranslations("proyectos.metricas");
  const { data, error } = await supabase.rpc("metricas_obra", { p_obra_id: obraId });
  if (error) reportarErrorSupabase(error, { rpc: "metricas_obra", obraId });
  const m = data?.[0];

  if (!m || m.cupo === 0) {
    return (
      <EstadoVacio
        icono="tablero"
        titulo={t("sinRolesTitulo")}
        detalle={t("sinRolesDetalle")}
      />
    );
  }

  if (m.alcance === 0) {
    return (
      <EstadoVacio
        icono="feed"
        titulo={t("sinAlcanceTitulo")}
        detalle={t("sinAlcanceDetalle")}
      />
    );
  }

  // Cuánta de la gente que decidió algo (Me interesa o Paso) se interesó. Es el número que
  // dice si la convocatoria es atractiva; el alcance solo dice si se está mostrando.
  const tasa = Math.round((m.interes_recibido / m.alcance) * 100);
  const convocadosCubierto = Math.min(m.convocados, m.cupo ?? 0);

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-4">
      <div className="flex items-end gap-5">
        {/* Número protagonista: para un dato único, un gráfico no agrega nada. */}
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold leading-none tracking-[-0.02em] text-texto">
            {tasa}
          </span>
          <span className="text-sm text-texto-tenue">%</span>
        </p>
        <p className="pb-0.5 text-xs leading-snug text-texto-tenue">
          {t("seIntereso")}
          <br />
          {t("dePersonas", { n: m.alcance })}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-borde pt-3.5">
        <div>
          <dt className="text-2xs uppercase tracking-wide text-texto-tenue">{t("interesMutuo")}</dt>
          <dd className="mt-0.5 text-lg font-semibold leading-none text-texto">{m.matches}</dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-texto-tenue">{t("convocados")}</dt>
          <dd className="mt-0.5 text-lg font-semibold leading-none text-texto">
            {convocadosCubierto}
            <span className="text-sm font-normal text-texto-tenue"> {t("deCupo", { cupo: m.cupo ?? "" })}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
