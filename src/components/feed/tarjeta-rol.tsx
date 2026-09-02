"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";

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
  obra_ubicacion_texto: string;
  creador_id: string;
  creador_nombre: string;
  creador_imagen_url: string | null;
  /** Tarjeta del onboarding, no una convocatoria real. Ver `lib/onboarding-ejemplo.ts`. */
  es_ejemplo?: boolean;
}

export function TarjetaRol({ rol }: { rol: RolFeed }) {
  const [expandido, setExpandido] = useState(false);

  const rango =
    rol.edad_minima && rol.edad_maxima ? `${rol.edad_minima}–${rol.edad_maxima} años` : null;

  return (
    <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-superficie shadow-tarjeta ring-1 ring-ink-900/5">
      {/* Zona "escenario": alto contraste para que la tarjeta se lea de un vistazo. */}
      <div className="flex flex-1 flex-col justify-between bg-ink-950 p-6 text-white">
        <div className="flex items-center gap-2">
          {/* El distintivo va primero y en color: si alguien mira la tarjeta un segundo, esto
              es lo único que no se puede perder. Una convocatoria falsa que se confunde con
              una real es peor que no mostrar nada. */}
          {rol.es_ejemplo && (
            <span className="rounded-md bg-brand-500 px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-white">
              Ejemplo
            </span>
          )}
          <span className="rounded-md bg-superficie/10 px-2 py-1 text-2xs font-medium uppercase tracking-wide text-white/70">
            {rol.rol_tipo === "tecnica" ? "Técnica" : "Actuación"}
          </span>
          <span className="text-2xs text-white/50">{rol.obra_ubicacion_texto}</span>
        </div>

        <div>
          <h2 className="text-2xl font-semibold leading-[1.1] tracking-[-0.02em]">
            {rol.obra_titulo}
          </h2>
          <p className="mt-2.5 text-lg font-medium text-white/90">{rol.rol_nombre}</p>
          {rango && <p className="mt-1 text-sm text-white/50">{rango}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-borde px-5 py-3">
        {rol.creador_imagen_url ? (
          <Imagen
            src={rol.creador_imagen_url}
            alt=""
            width={28}
            height={28}
            contenedorClassName="shrink-0 rounded-full"
            fallback={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-2xs font-semibold text-texto-tenue">
                {rol.creador_nombre[0]}
              </span>
            }
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-2xs font-semibold text-texto-tenue">
            {rol.creador_nombre[0]}
          </span>
        )}
        <span className="flex-1 truncate text-sm text-ink-700">{rol.creador_nombre}</span>
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
        <div className="max-h-44 space-y-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-texto-tenue">
          {rol.es_ejemplo && (
            <p className="rounded-lg bg-fondo-sutil px-3 py-2 text-xs text-texto-tenue">
              Esta convocatoria no existe: es un ejemplo para mostrarte cómo funciona Yalope.
              Deslizá o usá los botones — no se le avisa a nadie.
            </p>
          )}
          {rol.rol_descripcion && (
            <div>
              <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-400">
                Sobre el rol
              </p>
              <p>{rol.rol_descripcion}</p>
            </div>
          )}
          {rol.obra_sinopsis && (
            <div>
              <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-400">
                Sinopsis
              </p>
              <p>{rol.obra_sinopsis}</p>
            </div>
          )}
          {/* En un ejemplo no hay perfil que abrir: el `creador_id` es un slug inventado y el
              link daría 404. */}
          {!rol.es_ejemplo && (
            <Link
              href={`/creadores/${rol.creador_id}`}
              className="inline-flex items-center gap-1 font-medium text-texto hover:underline"
            >
              Ver perfil de {rol.creador_nombre}
              <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
