"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcularEdad } from "@/lib/constantes";
import { PerfilTalentoDetalle, type TalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import type { EstadoPostulacion } from "@/lib/supabase/types";

export interface PostulanteConTalento {
  postulacionId: string;
  estado: EstadoPostulacion;
  talento: TalentoDetalle;
}

const ETIQUETAS: { valor: EstadoPostulacion; label: string; estilo: string }[] = [
  { valor: "rechazado", label: "Rechazar", estilo: "bg-ink-100 text-ink-700" },
  { valor: "en_duda", label: "En duda", estilo: "bg-amber-50 text-amber-700" },
  { valor: "aprobado", label: "Aprobar", estilo: "bg-brand-500 text-white" },
];

export function BandejaPostulantes({
  postulantesIniciales,
  vacantes,
  obraCerrada,
}: {
  postulantesIniciales: PostulanteConTalento[];
  vacantes: number;
  obraCerrada: boolean;
}) {
  const [postulantes, setPostulantes] = useState(postulantesIniciales);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aprobados = postulantes.filter((p) => p.estado === "aprobado").length;

  async function clasificar(postulacionId: string, estado: EstadoPostulacion) {
    setError(null);
    const anterior = postulantes;

    if (estado === "aprobado" && aprobados >= vacantes) {
      setError("Ya cubriste las vacantes de este rol. Liberá una antes de aprobar otra.");
      return;
    }

    setPostulantes((prev) => prev.map((p) => (p.postulacionId === postulacionId ? { ...p, estado } : p)));

    const supabase = createClient();
    const { error: errorUpdate } = await supabase
      .from("postulaciones")
      .update({ estado })
      .eq("id", postulacionId);

    if (errorUpdate) {
      setPostulantes(anterior);
      setError("No pudimos guardar la clasificación. Probá de nuevo.");
    }
  }

  if (postulantes.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-ink-200 p-8 text-center">
        <p className="text-3xl">🎭</p>
        <p className="mt-2 font-medium text-ink-900">Todavía no hay postulantes</p>
        <p className="mt-1 text-sm text-ink-500">Cuando alguien se postule a este rol, va a aparecer acá.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-500">
        {aprobados}/{vacantes} vacantes cubiertas
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-3">
        {postulantes.map((p) => {
          const foto = [...p.talento.fotos].sort((a, b) => a.orden - b.orden)[0];
          const expandido = expandidoId === p.postulacionId;
          return (
            <li key={p.postulacionId} className="overflow-hidden rounded-card border border-ink-100 bg-white">
              <button
                type="button"
                onClick={() => setExpandidoId(expandido ? null : p.postulacionId)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto.url} alt={p.talento.nombre} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-ink-100" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-ink-900">{p.talento.nombre}</p>
                  <p className="text-xs text-ink-500">
                    {calcularEdad(p.talento.fecha_nacimiento)} años · {p.talento.locacion}
                  </p>
                </div>
                <span className="text-ink-300">{expandido ? "▲" : "▼"}</span>
              </button>

              {expandido && (
                <div className="border-t border-ink-100 p-4">
                  <PerfilTalentoDetalle talento={p.talento} />
                </div>
              )}

              {!obraCerrada && (
                <div className="flex border-t border-ink-100">
                  {ETIQUETAS.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => clasificar(p.postulacionId, e.valor)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        p.estado === e.valor ? e.estilo : "text-ink-500 hover:bg-ink-50"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
