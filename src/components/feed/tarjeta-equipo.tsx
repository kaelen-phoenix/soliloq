"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";

export interface EquipoFeed {
  equipo_id: string;
  titulo: string;
  cupo: number;
  creador_id: string;
  creador_nombre: string;
  creador_imagen_url: string | null;
  /** URLs ya resueltas. Al menos 3 (lo garantiza `feed_equipos_para_talento`). */
  fotos: string[];
}

/**
 * Tarjeta de "Armar equipo" en el feed del talento. A diferencia de la de un proyecto
 * —panel oscuro y geométrico—, esta va con la foto adelante: un equipo se propone con la
 * cara de quien lo arma, no con un rol.
 */
export function TarjetaEquipo({ equipo }: { equipo: EquipoFeed }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie shadow-tarjeta">
      <div className="relative flex-1 bg-ink-950">
        {equipo.fotos[0] && (
          <Imagen
            src={equipo.fotos[0]}
            alt=""
            fill
            absoluto
            sizes="(max-width: 640px) 100vw, 384px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-4">
          <span className="rounded-md bg-brand-400 px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-ink-950">
            Armar equipo
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h2 className="text-2xl font-semibold leading-[1.1] tracking-[-0.02em]">
            {equipo.titulo}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Hasta {equipo.cupo} {equipo.cupo === 1 ? "integrante" : "integrantes"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-borde px-5 py-3">
        {equipo.creador_imagen_url ? (
          <Imagen
            src={equipo.creador_imagen_url}
            alt=""
            width={28}
            height={28}
            contenedorClassName="shrink-0 rounded-full"
            fallback={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-2xs font-semibold text-texto-tenue">
                {equipo.creador_nombre[0]}
              </span>
            }
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-2xs font-semibold text-texto-tenue">
            {equipo.creador_nombre[0]}
          </span>
        )}
        <span className="flex-1 truncate text-sm text-texto">{equipo.creador_nombre}</span>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-texto-tenue hover:text-texto"
        >
          {expandido ? "Menos" : "Detalle"}
          <Icono
            nombre="chevron"
            className={`h-3.5 w-3.5 transition-transform ${expandido ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expandido && (
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-texto-tenue">
          {equipo.fotos.length > 1 && (
            <div className="grid grid-cols-3 gap-1.5">
              {equipo.fotos.slice(1, 4).map((url, i) => (
                <Imagen
                  key={i}
                  src={url}
                  alt=""
                  fill
                  sizes="120px"
                  contenedorClassName="aspect-square rounded-md"
                />
              ))}
            </div>
          )}
          <Link
            href={`/creadores/${equipo.creador_id}`}
            className="inline-flex items-center gap-1 font-medium text-texto hover:underline"
          >
            Ver perfil de {equipo.creador_nombre}
            <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </article>
  );
}
