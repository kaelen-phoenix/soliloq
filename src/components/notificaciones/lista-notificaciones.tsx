"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Imagen } from "@/components/ui/imagen";
import { createClient } from "@/lib/supabase/client";
import type { TipoNotificacion } from "@/lib/supabase/types";

type Creador = { nombre: string; imagen_url: string | null };
type Obra = { titulo: string; perfiles_creador: Creador | Creador[] | null };

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  leida_en: string | null;
  creado_en: string;
  obra_id: string | null;
  rol_id: string | null;
  sala_id: string | null;
  /** Quién generó el interés, para `interes_recibido`. */
  de_perfil: string | null;
  obras: Obra | Obra[] | null;
}

/** PostgREST devuelve la relación como objeto o como array según la cardinalidad que infiere. */
function primero<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function tituloObra(n: Notificacion): string {
  return primero(n.obras)?.titulo ?? "una obra";
}

function fotoDelProyecto(n: Notificacion): string | null {
  // El proyecto no tiene foto propia: su cara es la del creador que lo publica.
  return primero(primero(n.obras)?.perfiles_creador ?? null)?.imagen_url ?? null;
}

/**
 * Las dos caras del equipo, montadas una sobre otra. El anillo blanco es lo que las separa
 * cuando se superponen; sin él las dos fotos se funden en una mancha.
 */
function ParDeCaras({ propia, proyecto }: { propia: string | null; proyecto: string | null }) {
  const base = "h-9 w-9 shrink-0 rounded-full border-2 border-white bg-ink-100 object-cover";

  // El hueco relleno cuando falta la foto: sin él las dos caras se desalinean según quién
  // tenga imagen. Decorativo, así que va sin texto alternativo.
  const Cara = ({ url, extra = "" }: { url: string | null; extra?: string }) =>
    url ? (
      <Imagen
        src={url}
        alt=""
        width={36}
        height={36}
        contenedorClassName={`shrink-0 rounded-full border-2 border-white ${extra}`}
        fallback={<span className={`${base} ${extra}`} aria-hidden="true" />}
      />
    ) : (
      <span className={`${base} ${extra}`} aria-hidden="true" />
    );

  return (
    <span className="flex shrink-0 items-center">
      <Cara url={propia} />
      <Cara url={proyecto} extra="-ml-3" />
    </span>
  );
}

export function ListaNotificaciones({
  notificacionesIniciales,
  fotoPropia = null,
}: {
  notificacionesIniciales: Notificacion[];
  fotoPropia?: string | null;
}) {
  const [notificaciones, setNotificaciones] = useState(notificacionesIniciales);
  const router = useRouter();

  const hayNoLeidas = notificaciones.some((n) => !n.leida_en);

  async function marcarLeida(id: string) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida_en: n.leida_en ?? new Date().toISOString() } : n))
    );
    const supabase = createClient();
    await supabase.from("notificaciones").update({ leida_en: new Date().toISOString() }).eq("id", id);
  }

  async function marcarTodasLeidas() {
    const ahora = new Date().toISOString();
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida_en: n.leida_en ?? ahora })));
    const supabase = createClient();
    await supabase.from("notificaciones").update({ leida_en: ahora }).is("leida_en", null);
  }

  async function abrir(n: Notificacion) {
    await marcarLeida(n.id);
    if ((n.tipo === "sala_creada" || n.tipo === "equipo_armado") && n.sala_id) {
      router.push(`/salas/${n.sala_id}`);
    } else if (n.tipo === "convocado" || n.tipo === "espera_vencida") {
      // A postulaciones y no a la obra: es donde están los botones de confirmar, y donde
      // se explica por qué la espera se cerró.
      router.push("/postulaciones");
    } else if (n.tipo === "match" && n.obra_id) {
      router.push(`/obras/${n.obra_id}`);
    } else if (n.tipo === "interes_recibido" && n.de_perfil) {
      router.push(`/equipo/responder/${n.de_perfil}`);
    }
  }

  if (notificaciones.length === 0) {
    return (
      <EstadoVacio
        icono="campana"
        titulo="Sin notificaciones"
        detalle="Acá vas a ver los avisos cuando se arma un equipo y cuando se abre una sala."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hayNoLeidas && (
        <button
          type="button"
          onClick={marcarTodasLeidas}
          className="self-end text-xs font-medium text-texto-tenue hover:text-texto"
        >
          Marcar todas como leídas
        </button>
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {notificaciones.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => abrir(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                n.leida_en ? "border-borde bg-superficie" : "border-borde bg-fondo-sutil"
              }`}
            >
              {!n.leida_en && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}

              {/* `tipo` es el valor del enum en la base, no el texto: la etiqueta visible
                  cambió a "hay equipo" pero el dato almacenado sigue siendo `match`. */}
              {n.tipo === "match" && (
                <ParDeCaras propia={fotoPropia} proyecto={fotoDelProyecto(n)} />
              )}

              <div className={n.leida_en && n.tipo !== "match" ? "pl-[18px]" : ""}>
                {n.tipo === "match" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      ¡Hay equipo!
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      Te sumaste a <span className="font-medium">{tituloObra(n)}</span>
                    </p>
                  </>
                ) : n.tipo === "convocado" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      ¡Fuiste convocado!
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      Te quieren sumar a <span className="font-medium">{tituloObra(n)}</span>.
                      Confirmá que seguís disponible.
                    </p>
                  </>
                ) : n.tipo === "equipo_armado" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      ¡Hay equipo!
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      El interés fue mutuo. Ya pueden hablar.
                    </p>
                  </>
                ) : n.tipo === "interes_recibido" ? (
                  <p className="text-base leading-snug text-texto">
                    Alguien quiere contactarte desde tu perfil
                  </p>
                ) : n.tipo === "espera_vencida" ? (
                  <p className="text-base leading-snug text-texto-tenue">
                    Tu postulación a <span className="font-medium">{tituloObra(n)}</span> se cerró
                    sin respuesta.
                  </p>
                ) : (
                  <p className="text-base leading-snug text-texto">
                    Se abrió la sala de <span className="font-medium">{tituloObra(n)}</span>
                  </p>
                )}
                <p className="mt-0.5 text-2xs text-ink-400">
                  {new Date(n.creado_en).toLocaleString("es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
