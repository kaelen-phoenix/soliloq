"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { adminRevisarConIa, type MarcaModeracion } from "@/app/(sitio)/(app)/admin/acciones";

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
  const t = useTranslations("admin.revision");
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
      setError(t("errorRevisar"));
    } finally {
      setEstado("listo");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-texto-tenue">
        {t("explicacion")}
      </p>
      <button
        type="button"
        onClick={revisar}
        disabled={estado === "revisando"}
        className="self-start rounded-full bg-accion px-4 py-2 text-sm font-semibold text-accion-texto disabled:opacity-50"
      >
        {estado === "revisando" ? t("revisando") : t("revisar")}
      </button>
      {error && <p className="text-sm text-error-600">{error}</p>}
      {resultado && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-texto">
            {t("revisamos", { n: resultado.revisados })}{" "}
            {resultado.marcados.length === 0
              ? t("nadaParaMirar")
              : t("paraMirar", { n: resultado.marcados.length })}
          </p>
          <ul className="flex flex-col gap-2">
            {resultado.marcados.map((m, i) => {
              const href = enlace(m);
              return (
                <li key={`${m.tipo}-${m.id}-${i}`} className="rounded-xl border border-borde bg-superficie p-3.5">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-texto-tenue">{t(`tipo.${m.tipo}`)}</p>
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
