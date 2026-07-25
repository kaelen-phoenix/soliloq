import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  cerrada: "Cerrada",
};

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-ink-600",
  publicada: "bg-ink-900 text-white",
  cerrada: "bg-ink-50 text-ink-400",
};

export async function TableroCreador({ creadorId }: { creadorId: string }) {
  const supabase = createClient();

  const { data: obras } = await supabase
    .from("obras")
    .select("id, titulo, estado, roles(id, postulaciones(id, estado))")
    .eq("creador_id", creadorId)
    .order("creado_en", { ascending: false });

  return (
    <main className="px-5 py-5">
      <Link
        href="/obras/nueva"
        className="mb-5 flex items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-ink-800"
      >
        <Icono nombre="mas" className="h-4 w-4" />
        Crear nueva obra
      </Link>

      {(!obras || obras.length === 0) && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-8 py-12 text-center">
          <Icono nombre="tablero" className="h-8 w-8 text-ink-300" />
          <p className="mt-3 text-[15px] font-medium text-ink-900">Todavía no creaste ninguna obra</p>
          <p className="mt-1 text-[13px] text-ink-500">
            Creá tu primera convocatoria para empezar a recibir postulantes.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {obras?.map((obra) => {
          const pendientes = obra.roles.reduce(
            (acc: number, r: any) => acc + r.postulaciones.filter((p: any) => p.estado === "pendiente").length,
            0
          );
          return (
            <li key={obra.id}>
              <Link
                href={`/obras/${obra.id}`}
                className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 transition-colors hover:border-ink-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink-900">{obra.titulo}</p>
                  <span
                    className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COLOR_ESTADO[obra.estado]}`}
                  >
                    {ETIQUETA_ESTADO[obra.estado]}
                  </span>
                </div>
                {pendientes > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {pendientes}
                  </span>
                )}
                <Icono nombre="chevron" className="h-4 w-4 -rotate-90 text-ink-300" />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
