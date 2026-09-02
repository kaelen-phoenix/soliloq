"use client";

import { useState } from "react";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
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
  { valor: "en_duda", label: "En duda", estilo: "bg-alerta-50 text-alerta-800" },
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
    // Se relee el estado en vez de confiar en el que se mandó: aprobar una postulación
    // vieja no da `aprobado` sino `esperando_confirmacion`, porque el trigger intercala el
    // pedido de reconfirmación. Sin esto la pantalla diría que hay equipo cuando todavía
    // falta que la persona conteste.
    const { data, error: errorUpdate } = await supabase
      .from("postulaciones")
      .update({ estado })
      .eq("id", postulacionId)
      .select("estado")
      .single();

    if (errorUpdate) {
      setPostulantes(anterior);
      setError(
        errorUpdate.message.includes("vacante")
          ? "Ese rol ya cubrió sus vacantes."
          : "No pudimos guardar la clasificación. Probá de nuevo."
      );
      return;
    }

    if (data && data.estado !== estado) {
      setPostulantes((prev) =>
        prev.map((p) => (p.postulacionId === postulacionId ? { ...p, estado: data.estado } : p))
      );
    }
  }

  if (postulantes.length === 0) {
    return (
      <EstadoVacio
        icono="perfil"
        titulo="Todavía no hay postulantes"
        detalle="Cuando alguien se postule a este rol va a aparecer acá, y vas a poder aprobarlo, dejarlo en duda o descartarlo."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-texto-tenue">
        {aprobados}/{vacantes} vacantes cubiertas
      </p>
      {error && <p className="text-xs text-error-600">{error}</p>}

      <ul className="flex flex-col gap-2.5">
        {postulantes.map((p) => {
          const foto = [...p.talento.fotos].sort((a, b) => a.orden - b.orden)[0];
          const expandido = expandidoId === p.postulacionId;
          return (
            <li key={p.postulacionId} className="overflow-hidden rounded-xl border border-borde bg-superficie">
              <button
                type="button"
                onClick={() => setExpandidoId(expandido ? null : p.postulacionId)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                {foto ? (
                  <Imagen
                    src={foto.url}
                    alt=""
                    width={56}
                    height={56}
                    contenedorClassName="shrink-0 rounded-lg"
                    fallback={
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-100">
                        <Icono nombre="imagen" className="h-5 w-5 text-ink-300" />
                      </div>
                    }
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-100">
                    <Icono nombre="imagen" className="h-5 w-5 text-ink-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-texto">{p.talento.nombre}</p>
                  <p className="mt-0.5 text-xs text-texto-tenue">
                    {calcularEdad(p.talento.fecha_nacimiento)} años · {p.talento.ubicacion_publica}
                  </p>
                </div>
                <Icono
                  nombre="chevron"
                  className={`h-4 w-4 shrink-0 text-ink-300 transition-transform ${expandido ? "rotate-180" : ""}`}
                />
              </button>

              {expandido && (
                <div className="border-t border-borde p-4">
                  <PerfilTalentoDetalle talento={p.talento} />
                </div>
              )}

              {p.estado === "esperando_confirmacion" && (
                <p className="flex items-center gap-1.5 border-t border-borde bg-brand-500/5 px-4 py-2.5 text-xs leading-snug text-texto-tenue">
                  <Icono nombre="reloj" className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                  Le pedimos que confirme: su postulación tenía más de una semana. La vacante
                  sigue libre hasta que conteste.
                </p>
              )}

              {p.estado === "vencida" && (
                <p className="border-t border-borde px-4 py-2.5 text-xs leading-snug text-ink-400">
                  Se cerró sola por falta de respuesta.
                </p>
              )}

              {!obraCerrada && (
                <div className="flex gap-px border-t border-borde bg-ink-100">
                  {ETIQUETAS.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => clasificar(p.postulacionId, e.valor)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        p.estado === e.valor ? e.estilo : "bg-superficie text-texto-tenue hover:bg-fondo-sutil"
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
