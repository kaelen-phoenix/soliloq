"use client";

import Link from "next/link";
import { useState } from "react";

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

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-lg">
      <div className="flex flex-1 flex-col justify-end bg-gradient-to-br from-brand-400 to-brand-600 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">{rol.locacion_ensayos}</p>
        <h2 className="mt-1 text-2xl font-bold">{rol.obra_titulo}</h2>
        <p className="mt-1 text-lg font-medium">{rol.rol_nombre}</p>
        <p className="mt-1 text-sm text-white/80">
          {rol.edad_minima && rol.edad_maxima ? `${rol.edad_minima}-${rol.edad_maxima} años · ` : ""}
          {rol.creador_nombre}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="border-t border-ink-100 px-6 py-3 text-center text-sm font-medium text-brand-600"
      >
        {expandido ? "Ver menos ▲" : "Ver detalle ▼"}
      </button>

      {expandido && (
        <div className="max-h-52 overflow-y-auto border-t border-ink-100 px-6 py-4 text-sm text-ink-700">
          {rol.rol_descripcion && (
            <>
              <p className="font-semibold text-ink-900">Sobre el rol</p>
              <p className="mb-3">{rol.rol_descripcion}</p>
            </>
          )}
          {rol.obra_sinopsis && (
            <>
              <p className="font-semibold text-ink-900">Sinopsis</p>
              <p className="mb-3">{rol.obra_sinopsis}</p>
            </>
          )}
          <Link href={`/creadores/${rol.creador_id}`} className="font-medium text-brand-600">
            Ver perfil de {rol.creador_nombre} →
          </Link>
        </div>
      )}
    </div>
  );
}
