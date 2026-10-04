"use client";

import Link from "next/link";
import { useState } from "react";
import { adminRevisarConIa, type MarcaModeracion } from "@/app/(app)/admin/acciones";

const ETIQUETA: Record<MarcaModeracion["tipo"], string> = {
  perfil: "Perfil",
  proyecto: "Proyecto",
  equipo: "Equipo",
  rol: "Rol",
};

/** Adónde ir a mirar cada cosa marcada. Un Equipo no tiene página propia: se busca en Publicaciones. */
function enlace(m: MarcaModeracion): string | null {
  if (m.tipo === "perfil") return `/talentos/${m.id}`;
  if (m.tipo === "proyecto" || m.tipo === "rol") return `/obras/${m.id}`;
  return null;
}

/**
 * Pestaña «Revisión» del panel (#323): pasa lo publicado hace poco por la IA y lista lo que
 * parece problemático (posible estafa, contenido sexual, odio, spam, contacto por fuera). No
 * toca nada: las medidas (suspender, borrar) se toman en las otras pestañas.
 */
export function RevisionIa() {
  const [estado, setEstado] = useState<"listo" | "revisando">("listo");
  const [resultado, setResultado] = useState<{ marcados: MarcaModeracion[]; revisados: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revisar() {
    setEstado("revisando");
    setError(null);
    try {
      const r = await adminRevisarConIa();
      if (!r.ok) return setError(r.error);
      setResultado({ marcados: r.marcados, revisados: r.revisados });
    } catch {
      setError("No se pudo revisar. Probá de nuevo.");
    } finally {
      setEstado("listo");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-texto-tenue">
        La IA lee los perfiles, proyectos, equipos y roles más recientes y marca lo que parece un
        problema: pedidos de plata para participar, contenido sexual, insultos, spam o datos de
        contacto para sacar a la gente de la app. Es una ayuda: revisá cada caso antes de actuar.
      </p>
      <button
        type="button"
        onClick={revisar}
        disabled={estado === "revisando"}
        className="self-start rounded-full bg-accion px-4 py-2 text-sm font-semibold text-accion-texto disabled:opacity-50"
      >
        {estado === "revisando" ? "Revisando…" : "✨ Revisar lo reciente con IA"}
      </button>
      {error && <p className="text-sm text-error-600">{error}</p>}
      {resultado && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-texto">
            Revisamos {resultado.revisados} publicaciones.{" "}
            {resultado.marcados.length === 0
              ? "No encontramos nada para mirar."
              : `${resultado.marcados.length} para mirar:`}
          </p>
          <ul className="flex flex-col gap-2">
            {resultado.marcados.map((m, i) => {
              const href = enlace(m);
              return (
                <li key={`${m.tipo}-${m.id}-${i}`} className="rounded-xl border border-borde bg-superficie p-3.5">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-texto-tenue">{ETIQUETA[m.tipo]}</p>
                  {href ? (
                    <Link href={href} className="text-sm font-medium text-texto hover:underline">
                      {m.titulo}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-texto">{m.titulo}</p>
                  )}
                  <p className="mt-1 text-sm text-alerta-800">{m.motivo}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
