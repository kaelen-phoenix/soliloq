import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  en_duda: "En duda",
  aprobado: "¡Match! 🎉",
  rechazado: "No fue esta vez",
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-ink-100 text-ink-700",
  en_duda: "bg-amber-50 text-amber-700",
  aprobado: "bg-brand-50 text-brand-600",
  rechazado: "bg-ink-100 text-ink-500",
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
    <main className="px-6 py-6">
      <h1 className="mb-4 text-xl font-bold text-ink-900">Tus postulaciones</h1>

      {(!postulaciones || postulaciones.length === 0) && (
        <div className="rounded-card border border-dashed border-ink-200 p-8 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 font-medium text-ink-900">Todavía no te postulaste a ninguna convocatoria</p>
          <Link href="/" className="mt-2 inline-block text-sm font-medium text-brand-600">
            Ir al feed →
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {postulaciones?.map((p: any) => (
          <li key={p.id} className="rounded-card border border-ink-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-ink-900">{p.roles.obras.titulo}</p>
                <p className="text-sm text-ink-500">
                  {p.roles.nombre} · {p.roles.obras.perfiles_creador.nombre}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO[p.estado]}`}>
                {ETIQUETA_ESTADO[p.estado]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
