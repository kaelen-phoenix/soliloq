import { createClient } from "@/lib/supabase/server";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import type { Database } from "@/lib/supabase/types";

type MetricaRol = Database["public"]["Functions"]["metricas_obra"]["Returns"][number];

/**
 * Los dos colores que portan significado están validados para daltonismo; los otros dos
 * estados son neutros a propósito, porque "pendiente" y "rechazado" no tienen que competir
 * con el resto de la pantalla. Como la separación en visión tritan queda en la banda baja,
 * cada segmento lleva etiqueta directa: el color nunca es el único portador del dato.
 */
const SEGMENTOS = [
  { clave: "aprobados", etiqueta: "Hay equipo", color: "bg-brand-500", texto: "text-brand-600" },
  { clave: "en_duda", etiqueta: "En duda", color: "bg-amber-700", texto: "text-amber-800" },
  { clave: "pendientes", etiqueta: "Sin ver", color: "bg-ink-300", texto: "text-ink-600" },
  { clave: "rechazados", etiqueta: "Descartados", color: "bg-ink-200", texto: "text-ink-500" },
] as const;

export async function MetricasObra({ obraId }: { obraId: string }) {
  const supabase = createClient();
  const { data } = await supabase.rpc("metricas_obra", { p_obra_id: obraId });
  const metricas: MetricaRol[] = data ?? [];

  if (metricas.length === 0) {
    return (
      <EstadoVacio
        icono="tablero"
        titulo="Todavía no hay roles"
        detalle="Definí al menos un rol y publicá la obra: acá vas a ver cómo rinde cada convocatoria."
      />
    );
  }

  const alcanceTotal = metricas.reduce((a, m) => a + m.alcance, 0);

  if (alcanceTotal === 0) {
    return (
      <EstadoVacio
        icono="feed"
        titulo="Todavía nadie vio la convocatoria"
        detalle="Cuando la obra esté publicada y aparezca en el feed, acá vas a ver a cuánta gente llegó y cuántos se postularon."
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {metricas.map((m) => (
          <li key={m.rol_id} className="rounded-2xl border border-ink-100 bg-white p-4">
            <FilaRol metrica={m} />
          </li>
        ))}
      </ul>

      {/* La leyenda va una sola vez al pie y no por tarjeta: repetirla en cada rol sería
          ruido, y el orden de los segmentos es siempre el mismo. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {SEGMENTOS.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <span className={`h-2 w-2 rounded-full ${s.color}`} aria-hidden="true" />
            {s.etiqueta}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilaRol({ metrica: m }: { metrica: MetricaRol }) {
  // Cuánta de la gente que vio el rol decidió postularse. Es el número que dice si la
  // convocatoria es atractiva; el alcance solo dice si se está mostrando.
  const tasa = m.alcance > 0 ? Math.round((m.postulaciones / m.alcance) * 100) : 0;
  const cubierto = Math.min(m.aprobados, m.vacantes);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-medium text-ink-900">{m.rol_nombre}</p>
        <p className="shrink-0 text-[12px] text-ink-500">
          {cubierto} de {m.vacantes} {m.vacantes === 1 ? "vacante" : "vacantes"}
        </p>
      </div>

      <div className="mt-3 flex items-end gap-5">
        {/* Número protagonista: para un dato único, un gráfico no agrega nada. */}
        <p className="flex items-baseline gap-1">
          <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink-900">
            {tasa}
          </span>
          <span className="text-[13px] text-ink-500">%</span>
        </p>
        <p className="pb-0.5 text-[12px] leading-snug text-ink-500">
          se postuló
          <br />
          de {m.alcance} {m.alcance === 1 ? "persona" : "personas"}
        </p>
      </div>

      {m.postulaciones > 0 && (
        <>
          {/* Barra segmentada: el hueco de 2px entre segmentos es lo que los separa cuando
              dos colores contiguos son parecidos, sin agregar bordes. */}
          <div className="mt-3.5 flex h-2 gap-[2px] overflow-hidden rounded-full">
            {SEGMENTOS.map((s) => {
              const valor = m[s.clave];
              if (valor === 0) return null;
              return (
                <span
                  key={s.clave}
                  className={`${s.color} first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(valor / m.postulaciones) * 100}%` }}
                  title={`${s.etiqueta}: ${valor}`}
                />
              );
            })}
          </div>

          <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
            {SEGMENTOS.map((s) => {
              const valor = m[s.clave];
              if (valor === 0) return null;
              return (
                <li key={s.clave} className="text-[12px] text-ink-500">
                  <span className={`font-medium ${s.texto}`}>{valor}</span> {s.etiqueta.toLowerCase()}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
