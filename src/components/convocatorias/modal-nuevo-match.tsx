"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { Superposicion } from "@/components/ui/superposicion";
import { Avatar } from "@/components/convocatorias/matches-lista";
import { marcarMatchMostrado } from "@/app/(app)/matches/acciones";

export interface MatchNuevo {
  matchId: string;
  nombre: string;
  fotoUrl: string | null;
  esEquipo: boolean;
  iniciativaTitulo: string;
  iniciativaFotoUrl: string | null;
}

/**
 * Aviso de "¡Tenés un Match!" (issue #194): aparece solo, una vez por match, al entrar a
 * Call Back. Cerrarlo (con "Aceptar" o con Esc/click afuera) no mueve nada de estado — el
 * match ya está en Call Back por el solo hecho de existir — solo marca el aviso como visto
 * para que no vuelva a aparecer. Con varios matches nuevos, se muestran de a uno.
 */
export function ModalNuevoMatch({ nuevos }: { nuevos: MatchNuevo[] }) {
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
    <Superposicion onCerrar={cerrar} etiqueta="Nuevo match">
      <div className="mx-auto w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
        <p className="text-2xs font-semibold uppercase tracking-wide text-coral-700">
          ¡Tenés un Match!
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
        <p className="mt-4 text-sm text-texto">
          {actual.nombre} hizo match con {actual.esEquipo ? "tu equipo" : "tu proyecto"}.
        </p>
        <button
          type="button"
          disabled={ocupado}
          onClick={cerrar}
          className="mt-4 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto disabled:opacity-50"
        >
          {ocupado ? "…" : "Aceptar"}
        </button>
      </div>
    </Superposicion>
  );
}
