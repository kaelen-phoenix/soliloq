"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { desvincularDiscord } from "@/app/acciones-discord";

/** Los `?discord=` que deja la vuelta del OAuth; el texto de cada uno está en los mensajes. */
const RESULTADOS = ["vinculado", "en-uso", "cancelado", "error", "no-configurado"];

/**
 * «Vincular mi Discord» (#269), dentro de la sección Comunidad del perfil. Con la cuenta
 * vinculada, entrás solo a los espacios privados de tus Proyectos y Equipos.
 */
export function VincularDiscord({ usuario, resultado }: { usuario: string | null; resultado?: string }) {
  const router = useRouter();
  const t = useTranslations("chats.vincularDiscord");
  const [quitando, setQuitando] = useState(false);
  const mensaje = resultado && RESULTADOS.includes(resultado) ? t(`resultados.${resultado}`) : null;

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
            {t.rich("vinculadoComo", {
              usuario,
              b: (texto) => <span className="font-medium text-texto">{texto}</span>,
            })}
          </p>
          <button
            type="button"
            onClick={desvincular}
            disabled={quitando}
            className="text-xs font-medium text-texto-tenue underline hover:text-texto disabled:opacity-50"
          >
            {quitando ? t("desvinculando") : t("desvincular")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-texto-tenue">
            {t("ayuda")}
          </p>
          <a
            href="/api/discord/vincular"
            className="mt-3 inline-flex items-center rounded-full border border-borde px-4 py-2 text-sm font-medium text-texto hover:bg-fondo-sutil"
          >
            {t("boton")}
          </a>
        </>
      )}
    </div>
  );
}
