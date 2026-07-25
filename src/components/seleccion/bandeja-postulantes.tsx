"use client";

import { useState } from "react";
import { Icono } from "@/components/ui/icono";
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
  { valor: "en_duda", label: "En duda", estilo: "bg-amber-100 text-amber-800" },
  { valor: "aprobado", label: "Aprobar", estilo: "bg-ink-900 text-white" },
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
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-8 py-12 text-center">
        <Icono nombre="perfil" className="h-8 w-8 text-ink-300" />
        <p className="mt-3 text-[15px] font-medium text-ink-900">Todavía no hay postulantes</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-500">
          Cuando alguien se postule a este rol, va a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-ink-500">
        {aprobados}/{vacantes} vacantes cubiertas
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2.5">
        {postulantes.map((p) => {
          const foto = [...p.talento.fotos].sort((a, b) => a.orden - b.orden)[0];
          const expandido = expandidoId === p.postulacionId;
          return (
            <li key={p.postulacionId} className="overflow-hidden rounded-xl border border-ink-100 bg-white">
              <button
                type="button"
                onClick={() => setExpandidoId(expandido ? null : p.postulacionId)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-100">
                    <Icono nombre="imagen" className="h-5 w-5 text-ink-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink-900">{p.talento.nombre}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    {calcularEdad(p.talento.fecha_nacimiento)} años · {p.talento.locacion}
                  </p>
                </div>
                <Icono
                  nombre="chevron"
                  className={`h-4 w-4 shrink-0 text-ink-300 transition-transform ${expandido ? "rotate-180" : ""}`}
                />
              </button>

              {expandido && (
                <div className="border-t border-ink-100 p-4">
                  <PerfilTalentoDetalle talento={p.talento} />
                </div>
              )}

              {!obraCerrada && (
                <div className="flex gap-px border-t border-ink-100 bg-ink-100">
                  {ETIQUETAS.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => clasificar(p.postulacionId, e.valor)}
                      className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
                        p.estado === e.valor ? e.estilo : "bg-white text-ink-500 hover:bg-ink-50"
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
