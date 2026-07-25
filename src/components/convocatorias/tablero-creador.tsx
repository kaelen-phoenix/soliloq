import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  cerrada: "Cerrada",
};

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-ink-700",
  publicada: "bg-brand-50 text-brand-600",
  cerrada: "bg-ink-100 text-ink-500",
};

export async function TableroCreador({ creadorId }: { creadorId: string }) {
  const supabase = createClient();

  const { data: obras } = await supabase
    .from("obras")
    .select("id, titulo, estado, roles(id, postulaciones(id, estado))")
    .eq("creador_id", creadorId)
    .order("creado_en", { ascending: false });

  return (
    <main className="px-6 py-6">
      <Link
        href="/obras/nueva"
        className="mb-6 flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white"
      >
        + Crear nueva obra
      </Link>

      {(!obras || obras.length === 0) && (
        <div className="rounded-card border border-dashed border-ink-200 p-8 text-center">
          <p className="text-3xl">🎬</p>
          <p className="mt-2 font-medium text-ink-900">Todavía no creaste ninguna obra</p>
          <p className="mt-1 text-sm text-ink-500">Creá tu primera convocatoria para empezar a recibir postulantes.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {obras?.map((obra) => {
          const pendientes = obra.roles.reduce(
            (acc: number, r: any) => acc + r.postulaciones.filter((p: any) => p.estado === "pendiente").length,
            0
          );
          return (
            <li key={obra.id}>
              <Link
                href={`/obras/${obra.id}`}
                className="flex items-center justify-between rounded-card border border-ink-100 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-ink-900">{obra.titulo}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[obra.estado]}`}>
                    {ETIQUETA_ESTADO[obra.estado]}
                  </span>
                </div>
                {pendientes > 0 && (
                  <span className="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
                    {pendientes} sin revisar
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
