import Link from "next/link";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { ConfirmarConvocatoria } from "@/components/seleccion/confirmar-convocatoria";
import { createClient } from "@/lib/supabase/server";

// Lo que ve el talento sobre su propia postulación. `en_duda` no se muestra con esa palabra:
// enterarte de que alguien "duda" de vos no aporta nada y desalienta. Lo que importa es que
// sigue en juego.
const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Sin ver",
  en_duda: "Te tienen en cuenta",
  esperando_confirmacion: "Te esperan",
  aprobado: "Hay equipo",
  rechazado: "No quedó",
  vencida: "Sin respuesta",
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-ink-100 text-texto-tenue",
  en_duda: "bg-alerta-50 text-alerta-800",
  esperando_confirmacion: "bg-brand-500 text-white",
  aprobado: "bg-accion text-accion-texto",
  rechazado: "bg-fondo-sutil text-texto-tenue",
  vencida: "bg-fondo-sutil text-texto-tenue",
};

export default async function PostulacionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: postulaciones } = await supabase
    .from("postulaciones")
    .select(
      "id, estado, creado_en, roles(nombre, obras(id, titulo, perfiles_creador(nombre)))",
    )
    .eq("talento_id", user.id)
    .order("creado_en", { ascending: false });

  return (
    <main className="px-5 py-5">
      {(!postulaciones || postulaciones.length === 0) && (
        <EstadoVacio
          icono="postulaciones"
          titulo="Todavía no te postulaste"
          detalle="Deslizá a la derecha en el feed para postularte a una convocatoria. Acá vas a seguir cómo viene cada una."
          accion={
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-texto hover:underline"
            >
              Ir al feed
              <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
            </Link>
          }
        />
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {postulaciones?.map((p: any) => (
          <li
            key={p.id}
            className="rounded-xl border border-borde bg-superficie p-4"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-texto">
                  {p.roles.obras.titulo}
                </p>
                <p className="mt-0.5 truncate text-sm text-texto-tenue">
                  {p.roles.nombre} · {p.roles.obras.perfiles_creador.nombre}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-2xs font-medium uppercase tracking-wide ${COLOR_ESTADO[p.estado]}`}
              >
                {ETIQUETA_ESTADO[p.estado]}
              </span>
            </div>

            {p.estado === "esperando_confirmacion" && (
              <ConfirmarConvocatoria
                postulacionId={p.id}
                obraTitulo={p.roles.obras.titulo}
              />
            )}

            {p.estado === "vencida" && (
              <p className="mt-2 text-xs leading-snug text-texto-tenue">
                Pasaron 30 días sin respuesta, así que la cerramos. Podés volver
                a postularte si la convocatoria sigue abierta.
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
