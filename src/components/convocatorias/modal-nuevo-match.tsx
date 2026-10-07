"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { Superposicion } from "@/components/ui/superposicion";
import { Avatar } from "@/components/convocatorias/avatar";
import { marcarMatchMostrado } from "@/app/(sitio)/(app)/matches/acciones";

export interface MatchNuevo {
  matchId: string;
  nombre: string;
  fotoUrl: string | null;
  esEquipo: boolean;
  iniciativaTitulo: string;
  iniciativaFotoUrl: string | null;
}

/**
 * Ventana «Hay interés» (#194, #365) para el match que se formó del lado del Talento: aparece
 * sola, una vez por match, al entrar a Convocatorias. Es la misma que abre Buscar talento
 * cuando el match se forma ahí: las dos fotos, «Hay interés» y «Aceptar», sin convocar ni
 * descartar. Aceptar (o Esc/click afuera) no mueve nada de estado —el match ya está en
 * Convocatorias por existir—, solo marca la ventana como vista. Con varios, de a uno.
 */
export function ModalNuevoMatch({ nuevos }: { nuevos: MatchNuevo[] }) {
  const t = useTranslations("proyectos.nuevoMatch");
  const [cola, setCola] = useState(nuevos);
  const [ocupado, setOcupado] = useState(false);

  // Mismo motivo que en `ConvocadosLista`/`MatchesLista`: si otra acción de esta misma
  // pantalla dispara un `router.refresh()` (p.ej. aceptar un match desde la lista) mientras
  // hay un match nuevo sin mostrar, `useState(nuevos)` no lo recogía por sí solo.
  useEffect(() => setCola(nuevos), [nuevos]);

  if (cola.length === 0) return null;
  const actual = cola[0];

  async function cerrar() {
    setOcupado(true);
    await marcarMatchMostrado(actual.matchId);
    setOcupado(false);
    setCola((prev) => prev.slice(1));
  }

  return (
    <Superposicion onCerrar={cerrar} etiqueta={t("titulo")}>
      <div className="mx-auto w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral-700">
          {t("titulo")}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Avatar url={actual.fotoUrl} nombre={actual.nombre} size={64} />
          <Icono nombre="corazon" relleno className="h-5 w-5 text-coral" />
          {actual.iniciativaFotoUrl ? (
            <Imagen
              src={actual.iniciativaFotoUrl}
              alt={actual.iniciativaTitulo}
              width={64}
              height={64}
              contenedorClassName="h-16 w-16 rounded-full"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 p-1 text-2xs font-medium text-texto-tenue">
              {actual.iniciativaTitulo}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={ocupado}
          onClick={cerrar}
          className="mt-5 w-full rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto disabled:opacity-50"
        >
          {ocupado ? "…" : t("aceptar")}
        </button>
      </div>
    </Superposicion>
  );
}
