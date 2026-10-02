"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { desvincularDiscord } from "@/app/acciones-discord";

const MENSAJES: Record<string, string> = {
  vinculado: "¡Listo! Tu Discord quedó vinculado y ya estás en el servidor de Yalope.",
  "en-uso": "Esa cuenta de Discord ya está vinculada a otra cuenta de Yalope.",
  cancelado: "Cancelaste la vinculación en Discord.",
  error: "No se pudo vincular tu Discord. Probá de nuevo.",
  "no-configurado": "La vinculación con Discord todavía no está disponible.",
};

/**
 * «Vincular mi Discord» (#269), dentro de la sección Comunidad del perfil. Con la cuenta
 * vinculada, entrás solo a los espacios privados de tus Proyectos y Equipos.
 */
export function VincularDiscord({ usuario, resultado }: { usuario: string | null; resultado?: string }) {
  const router = useRouter();
  const [quitando, setQuitando] = useState(false);
  const mensaje = resultado ? MENSAJES[resultado] : null;

  async function desvincular() {
    setQuitando(true);
    await desvincularDiscord();
    setQuitando(false);
    router.replace("/perfil");
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-borde pt-4">
      {mensaje && <p className="mb-3 text-sm text-texto">{mensaje}</p>}
      {usuario ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-texto-tenue">
            Discord vinculado como <span className="font-medium text-texto">@{usuario}</span>
          </p>
          <button
            type="button"
            onClick={desvincular}
            disabled={quitando}
            className="text-xs font-medium text-texto-tenue underline hover:text-texto disabled:opacity-50"
          >
            {quitando ? "Desvinculando…" : "Desvincular"}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-texto-tenue">
            Vinculá tu cuenta de Discord para entrar a los espacios privados (texto y voz) de
            tus Proyectos y Equipos. Esos canales los ven solo sus integrantes y los
            administradores del servidor de Yalope.
          </p>
          <a
            href="/api/discord/vincular"
            className="mt-3 inline-flex items-center rounded-full border border-borde px-4 py-2 text-sm font-medium text-texto hover:bg-fondo-sutil"
          >
            Vincular mi Discord
          </a>
        </>
      )}
    </div>
  );
}
