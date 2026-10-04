import Link from "next/link";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { CrearProyecto } from "@/components/convocatorias/crear-proyecto";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  cerrada: "Cerrada",
  activo: "Activo",
  cerrado: "Cerrado",
};

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-texto-tenue",
  publicada: "bg-accion text-accion-texto",
  cerrada: "bg-fondo-sutil text-texto-tenue",
  activo: "bg-accion text-accion-texto",
  cerrado: "bg-fondo-sutil text-texto-tenue",
};

interface Item {
  id: string;
  tipo: "proyecto" | "equipo";
  titulo: string;
  estado: string;
  creadoEn: string;
}

/**
 * Mis proyectos (#341): un solo «Crear proyecto» —que pregunta si es un proyecto con roles o
 * un equipo— y una sola lista con todo lo armado, cada cosa con su etiqueta y su estado. Antes
 * «Armar proyecto» y «Armar equipo» eran dos pestañas y confundían. Desde #330 no hay límites:
 * se pueden tener varios de cada uno.
 */
export async function TableroCreador({ creadorId }: { creadorId: string }) {
  const supabase = createClient();

  const [{ data: obras }, { data: equipos }] = await Promise.all([
    supabase.from("obras").select("id, titulo, estado, creado_en").eq("creador_id", creadorId),
    supabase.from("equipos").select("id, titulo, activo, creado_en").eq("creador_id", creadorId),
  ]);

  const items: Item[] = [
    ...(obras ?? []).map((o) => ({
      id: o.id,
      tipo: "proyecto" as const,
      titulo: o.titulo,
      estado: o.estado,
      creadoEn: o.creado_en,
    })),
    ...(equipos ?? []).map((e) => ({
      id: e.id,
      tipo: "equipo" as const,
      titulo: e.titulo,
      estado: e.activo ? "activo" : "cerrado",
      creadoEn: e.creado_en,
    })),
  ].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

  return (
    <main className="flex flex-col gap-4 px-5 py-5">
      <CrearProyecto creadorId={creadorId} />

      {items.length === 0 ? (
        <EstadoVacio
          icono="tablero"
          titulo="Todavía no armaste ningún proyecto"
          detalle="Creá un proyecto con los roles que buscás, o armá un equipo para crear con otras personas."
        />
      ) : (
        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
          {items.map((it) => (
            <li key={`${it.tipo}-${it.id}`}>
              <Link
                href={it.tipo === "proyecto" ? `/obras/${it.id}` : `/equipos/${it.id}`}
                className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 transition-colors hover:border-texto"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-texto">{it.titulo}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {/* Mismos colores que en Explorar y Chats: Proyecto rojo, Equipo coral. */}
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                        it.tipo === "equipo" ? "bg-coral text-ink-950" : "bg-brand-600 text-white"
                      }`}
                    >
                      {it.tipo === "equipo" ? "Equipo" : "Proyecto"}
                    </span>
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide ${COLOR_ESTADO[it.estado]}`}
                    >
                      {ETIQUETA_ESTADO[it.estado]}
                    </span>
                  </div>
                </div>
                <Icono nombre="chevron" className="h-4 w-4 -rotate-90 text-texto-tenue" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
