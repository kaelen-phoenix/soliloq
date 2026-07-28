import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/server";

export default async function SalasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: integraciones } = await supabase
    .from("sala_integrantes")
    .select("sala_id, salas(id, obra_id, obras(titulo))")
    .eq("perfil_id", user.id);

  const salas = await Promise.all(
    (integraciones ?? []).map(async (i: any) => {
      const { data: ultimoMensaje } = await supabase
        .from("mensajes")
        .select("contenido, creado_en")
        .eq("sala_id", i.sala_id)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        salaId: i.sala_id,
        // La obra queda en null si se bloqueó a su creador (política restrictiva de 0022).
        titulo: i.salas?.obras?.titulo ?? "Proyecto",
        // Y el último mensaje ya viene filtrado por RLS: si lo escribió alguien bloqueado,
        // acá aparece el último que sí se puede leer.
        ultimoMensaje: ultimoMensaje?.contenido ?? null,
      };
    })
  );

  return (
    <main className="px-5 py-5">
      {salas.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-8 py-12 text-center">
          <Icono nombre="salas" className="h-8 w-8 text-ink-300" />
          <p className="mt-3 text-[15px] font-medium text-ink-900">Todavía no tenés salas</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-500">
            Se abren automáticamente cuando se concreta un match.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {salas.map((s) => (
          <li key={s.salaId}>
            <Link
              href={`/salas/${s.salaId}`}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 transition-colors hover:border-ink-200"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink-900">{s.titulo}</p>
                <p className="mt-0.5 truncate text-[13px] text-ink-500">
                  {s.ultimoMensaje ?? "Sala recién creada"}
                </p>
              </div>
              <Icono nombre="chevron" className="h-4 w-4 -rotate-90 shrink-0 text-ink-300" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
