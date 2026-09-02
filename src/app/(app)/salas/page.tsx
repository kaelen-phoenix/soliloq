import Link from "next/link";
import { EstadoVacio } from "@/components/ui/estado-vacio";
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
    .select("sala_id, salas(id, obra_id, titulo, obras(titulo))")
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
        // Tres casos: la obra presta su título; una sala sin obra trae el suyo; o la fila
        // de `obras` está escondida por bloqueo (0022) y no queda nada que mostrar.
        titulo: i.salas?.obras?.titulo ?? i.salas?.titulo ?? "Proyecto",
        // Y el último mensaje ya viene filtrado por RLS: si lo escribió alguien bloqueado,
        // acá aparece el último que sí se puede leer.
        ultimoMensaje: ultimoMensaje?.contenido ?? null,
      };
    })
  );

  return (
    <main className="px-5 py-5">
      {salas.length === 0 && (
        <EstadoVacio
          icono="salas"
          titulo="Todavía no tenés salas"
          detalle="Se abren solas cuando se arma un equipo: ahí vas a hablar con el resto del proyecto."
        />
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {salas.map((s) => (
          <li key={s.salaId}>
            <Link
              href={`/salas/${s.salaId}`}
              className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 transition-colors hover:border-borde"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-texto">{s.titulo}</p>
                <p className="mt-0.5 truncate text-sm text-texto-tenue">
                  {s.ultimoMensaje ?? "Sala recién creada"}
                </p>
              </div>
              <Icono nombre="chevron" className="h-4 w-4 -rotate-90 shrink-0 text-texto-tenue" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
