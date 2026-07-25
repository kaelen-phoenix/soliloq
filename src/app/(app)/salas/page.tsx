import Link from "next/link";
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
        titulo: i.salas.obras.titulo,
        ultimoMensaje: ultimoMensaje?.contenido ?? null,
      };
    })
  );

  return (
    <main className="px-6 py-6">
      <h1 className="mb-4 text-xl font-bold text-ink-900">Tus salas</h1>

      {salas.length === 0 && (
        <div className="rounded-card border border-dashed border-ink-200 p-8 text-center">
          <p className="text-3xl">💬</p>
          <p className="mt-2 font-medium text-ink-900">Todavía no tenés salas</p>
          <p className="mt-1 text-sm text-ink-500">Las salas se abren automáticamente cuando se concreta un match.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {salas.map((s) => (
          <li key={s.salaId}>
            <Link href={`/salas/${s.salaId}`} className="block rounded-card border border-ink-100 bg-white p-4">
              <p className="font-medium text-ink-900">{s.titulo}</p>
              <p className="truncate text-sm text-ink-500">{s.ultimoMensaje ?? "Sala recién creada"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
