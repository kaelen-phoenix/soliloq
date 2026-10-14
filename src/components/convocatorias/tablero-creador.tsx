import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { CrearProyecto } from "@/components/convocatorias/crear-proyecto";
import { IniciativasOcultas, QuitarIniciativa } from "@/components/convocatorias/quitar-iniciativa";
import { createClient } from "@/lib/supabase/server";
import { itemsTablero } from "@/lib/iniciativa-reglas";

// La etiqueta de cada estado sale de `proyectos.tablero.estado.<estado>`.
const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-ink-100 text-texto-tenue",
  publicada: "bg-accion text-accion-texto",
  cerrada: "bg-fondo-sutil text-texto-tenue",
  activo: "bg-accion text-accion-texto",
  cerrado: "bg-fondo-sutil text-texto-tenue",
};

/**
 * Mis proyectos (#341): un solo «Crear proyecto» —que pregunta si es un proyecto con roles o
 * un equipo— y una sola lista con todo lo armado, cada cosa con su etiqueta y su estado. Antes
 * «Armar proyecto» y «Armar equipo» eran dos pestañas y confundían. Desde #330 no hay límites:
 * se pueden tener varios de cada uno.
 */
export async function TableroCreador({ creadorId }: { creadorId: string }) {
  const supabase = createClient();
  const t = await getTranslations("proyectos.tablero");

  const [{ data: obras }, { data: equipos }] = await Promise.all([
    supabase.from("obras").select("id, titulo, estado, creado_en, oculta_en").eq("creador_id", creadorId),
    supabase.from("equipos").select("id, titulo, activo, creado_en, oculta_en").eq("creador_id", creadorId),
  ]);

  // Todo en una lista, lo más nuevo primero (`itemsTablero`, compartido con la app).
  const todos = itemsTablero(obras ?? [], equipos ?? []);
  // #413: las cerradas que su dueño quitó de la lista van aparte, al final.
  const items = todos.filter((it) => !it.oculta);
  const ocultas = todos.filter((it) => it.oculta);

  return (
    <main className="flex flex-col gap-4 px-5 py-5">
      <CrearProyecto creadorId={creadorId} />

      {items.length === 0 && ocultas.length === 0 ? (
        <EstadoVacio
          icono="tablero"
          titulo={t("vacioTitulo")}
          detalle={t("vacioDetalle")}
        />
      ) : (
        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(18rem,100%),1fr))]">
          {items.map((it) => (
            <li
              key={`${it.tipo}-${it.id}`}
              className="flex flex-wrap items-center rounded-xl border border-borde bg-superficie transition-colors hover:border-texto"
            >
              <Link
                href={it.tipo === "proyecto" ? `/obras/${it.id}` : `/equipos/${it.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 p-4"
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
                      {it.tipo === "equipo" ? t("equipo") : t("proyecto")}
                    </span>
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide ${COLOR_ESTADO[it.estado]}`}
                    >
                      {t(`estado.${it.estado}`)}
                    </span>
                  </div>
                </div>
                <Icono nombre="chevron" className="h-4 w-4 -rotate-90 text-texto-tenue" />
              </Link>
              {/* #413: lo cerrado se puede quitar de la lista (sin borrarlo). */}
              {it.cerrada && <QuitarIniciativa item={it} />}
            </li>
          ))}
        </ul>
      )}
      <IniciativasOcultas items={ocultas} />
    </main>
  );
}
