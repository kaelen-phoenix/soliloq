"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { abrirEspacioDiscord, sincronizarEspacioDeSala } from "@/app/acciones-discord";

const pildora =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-borde px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50";

/**
 * El espacio privado de la sala en Discord (#269), en la barra de título:
 * - si existe y tu Discord está vinculado → «Discord» (abre el canal);
 * - si existe y no lo vinculaste → «Vinculá tu Discord» (después entrás solo);
 * - si no existe y sos el dueño → «Abrir en Discord» (lo crea).
 * Al montar, pone al día quién está en el espacio (entradas, bajas, cierre).
 */
export function EspacioDiscord({
  salaId,
  url,
  esDueno,
  vinculado,
}: {
  salaId: string;
  url: string | null;
  esDueno: boolean;
  vinculado: boolean;
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url) void sincronizarEspacioDeSala(salaId).catch(() => {});
  }, [salaId, url]);

  async function abrir() {
    setCreando(true);
    setError(null);
    const r = await abrirEspacioDiscord(salaId);
    setCreando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (vinculado) window.open(r.url, "_blank", "noopener");
    router.refresh();
  }

  if (url && vinculado) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={pildora}>
        Abrir en Discord
      </a>
    );
  }
  if (url) {
    return (
      <a href={`/api/discord/vincular?volver=/salas/${salaId}`} className={pildora} title="Vinculá tu cuenta para entrar al espacio privado del grupo">
        Vinculá tu Discord
      </a>
    );
  }
  if (!esDueno) return null;
  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={abrir} disabled={creando} className={pildora}>
        {creando ? "Creando…" : "Crear espacio en Discord"}
      </button>
      {error && <span className="text-2xs text-error-600">{error}</span>}
    </span>
  );
}
