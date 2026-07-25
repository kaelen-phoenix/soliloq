"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";

export interface RolFeed {
  rol_id: string;
  rol_nombre: string;
  rol_tipo: string;
  edad_minima: number | null;
  edad_maxima: number | null;
  rol_descripcion: string | null;
  vacantes: number;
  obra_id: string;
  obra_titulo: string;
  obra_sinopsis: string | null;
  locacion_ensayos: string;
  creador_id: string;
  creador_nombre: string;
  creador_imagen_url: string | null;
}

export function TarjetaRol({ rol }: { rol: RolFeed }) {
  const [expandido, setExpandido] = useState(false);

  const rango =
    rol.edad_minima && rol.edad_maxima ? `${rol.edad_minima}–${rol.edad_maxima} años` : null;

  return (
    <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-ink-900/5">
      {/* Zona "escenario": alto contraste para que la tarjeta se lea de un vistazo. */}
      <div className="flex flex-1 flex-col justify-between bg-ink-950 p-6 text-white">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70">
            {rol.rol_tipo === "tecnica" ? "Técnica" : "Actuación"}
          </span>
          <span className="text-[11px] text-white/50">{rol.locacion_ensayos}</span>
        </div>

        <div>
          <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
            {rol.obra_titulo}
          </h2>
          <p className="mt-2.5 text-[17px] font-medium text-white/90">{rol.rol_nombre}</p>
          {rango && <p className="mt-1 text-sm text-white/50">{rango}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-ink-100 px-5 py-3">
        {rol.creador_imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rol.creador_imagen_url} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-600">
            {rol.creador_nombre[0]}
          </span>
        )}
        <span className="flex-1 truncate text-[13px] text-ink-700">{rol.creador_nombre}</span>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-500 hover:text-ink-900"
        >
          {expandido ? "Menos" : "Detalle"}
          <Icono
            nombre="chevron"
            className={`h-3.5 w-3.5 transition-transform ${expandido ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expandido && (
        <div className="max-h-44 space-y-3 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-ink-600">
          {rol.rol_descripcion && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                Sobre el rol
              </p>
              <p>{rol.rol_descripcion}</p>
            </div>
          )}
          {rol.obra_sinopsis && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                Sinopsis
              </p>
              <p>{rol.obra_sinopsis}</p>
            </div>
          )}
          <Link
            href={`/creadores/${rol.creador_id}`}
            className="inline-flex items-center gap-1 font-medium text-ink-900 hover:underline"
          >
            Ver perfil de {rol.creador_nombre}
            <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </article>
  );
}
