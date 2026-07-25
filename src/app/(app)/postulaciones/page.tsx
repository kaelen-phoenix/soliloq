import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  en_duda: "En duda",
  aprobado: "Match",
  rechazado: "No quedó",
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-ink-100 text-ink-600",
  en_duda: "bg-amber-100 text-amber-800",
  aprobado: "bg-ink-900 text-white",
  rechazado: "bg-ink-50 text-ink-400",
};

export default async function PostulacionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: postulaciones } = await supabase
    .from("postulaciones")
    .select("id, estado, creado_en, roles(nombre, obras(id, titulo, perfiles_creador(nombre)))")
    .eq("talento_id", user.id)
    .order("creado_en", { ascending: false });

  return (
    <main className="px-5 py-5">
      {(!postulaciones || postulaciones.length === 0) && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-8 py-12 text-center">
          <Icono nombre="postulaciones" className="h-8 w-8 text-ink-300" />
          <p className="mt-3 text-[15px] font-medium text-ink-900">Todavía no te postulaste</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-900 hover:underline"
          >
            Ir al feed
            <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {postulaciones?.map((p: any) => (
          <li
            key={p.id}
            className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink-900">{p.roles.obras.titulo}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-500">
                {p.roles.nombre} · {p.roles.obras.perfiles_creador.nombre}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COLOR_ESTADO[p.estado]}`}
            >
              {ETIQUETA_ESTADO[p.estado]}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
