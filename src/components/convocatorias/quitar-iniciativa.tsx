"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Icono } from "@/components/ui/icono";
import type { ItemTablero } from "@/lib/iniciativa-reglas";
import { createClient } from "@/lib/supabase/client";

/** Oculta o vuelve a mostrar una iniciativa cerrada (`ocultar_iniciativa`, 0115). */
async function ocultar(it: ItemTablero, ocultarla: boolean) {
  const { error } = await createClient().rpc("ocultar_iniciativa", {
    p_obra_id: it.tipo === "proyecto" ? it.id : null,
    p_equipo_id: it.tipo === "equipo" ? it.id : null,
    p_ocultar: ocultarla,
  });
  return !error;
}

/**
 * La «X» de una iniciativa cerrada en «Iniciativas» (#413): la quita de la lista, con
 * confirmación. No borra nada: el chat con el equipo sigue y se puede volver a mostrar.
 */
export function QuitarIniciativa({ item }: { item: ItemTablero }) {
  const t = useTranslations("proyectos.tablero");
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirmando) {
    return (
      <button
        type="button"
        aria-label={t("quitar")}
        title={t("quitar")}
        onClick={() => setConfirmando(true)}
        className="shrink-0 rounded-lg p-2 text-texto-tenue transition-colors hover:bg-fondo-sutil hover:text-texto"
      >
        <Icono nombre="cruz" className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={t("quitar")} className="flex w-full flex-col gap-2 border-t border-borde px-4 py-3">
      <p className="text-sm text-texto">{t("confirmarQuitar", { titulo: item.titulo })}</p>
      {error && <p className="text-xs text-error-600">{error}</p>}
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          cargando={enviando}
          onClick={async () => {
            setEnviando(true);
            setError(null);
            const ok = await ocultar(item, true);
            setEnviando(false);
            if (!ok) return setError(t("error"));
            setConfirmando(false);
            router.refresh();
          }}
        >
          {t("quitarBoton")}
        </Boton>
        <Boton variante="fantasma" disabled={enviando} onClick={() => setConfirmando(false)}>
          {t("cancelar")}
        </Boton>
      </div>
    </div>
  );
}

/** Las iniciativas quitadas, al final de la lista, para volver a mostrarlas (#413). */
export function IniciativasOcultas({ items }: { items: ItemTablero[] }) {
  const t = useTranslations("proyectos.tablero");
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((a) => !a)}
        className="self-start text-sm font-medium text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        {abierta ? t("esconderOcultas") : t("verOcultas", { n: items.length })}
      </button>
      {abierta && (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={`${it.tipo}-${it.id}`} className="flex items-center gap-3 rounded-xl border border-borde px-4 py-3">
              <Link
                href={it.tipo === "proyecto" ? `/obras/${it.id}` : `/equipos/${it.id}`}
                className="min-w-0 flex-1 truncate text-sm text-texto-tenue hover:text-texto"
              >
                {it.titulo}
              </Link>
              <Boton
                variante="fantasma"
                cargando={enviando === it.id}
                onClick={async () => {
                  setEnviando(it.id);
                  await ocultar(it, false);
                  setEnviando(null);
                  router.refresh();
                }}
              >
                {t("mostrar")}
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
