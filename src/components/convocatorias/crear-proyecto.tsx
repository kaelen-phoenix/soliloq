"use client";

import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { FormularioObra } from "@/components/convocatorias/formulario-obra";
import { GestionEquipo } from "@/components/convocatorias/gestion-equipo";

/**
 * «Crear proyecto» (#341): un solo punto de entrada. La primera pregunta es qué se quiere
 * armar —un proyecto con roles o un equipo para crear juntos— y recién ahí aparece el
 * formulario de cada uno. Antes eran dos pestañas al mismo nivel y confundían.
 */
export function CrearProyecto({ creadorId }: { creadorId: string }) {
  const [paso, setPaso] = useState<"cerrado" | "elegir" | "proyecto" | "equipo">("cerrado");

  if (paso === "proyecto") {
    return <FormularioObra creadorId={creadorId} abiertoInicial onCancelar={() => setPaso("elegir")} />;
  }
  if (paso === "equipo") {
    return (
      <GestionEquipo
        creadorId={creadorId}
        equipo={null}
        fotos={[]}
        cobertura={[]}
        abiertoInicial
        onCancelar={() => setPaso("elegir")}
      />
    );
  }
  if (paso === "elegir") {
    const opcion = (destino: "proyecto" | "equipo", titulo: string, texto: string, icono: "tablero" | "corazon") => (
      <button
        type="button"
        onClick={() => setPaso(destino)}
        className="flex items-start gap-3 rounded-xl border border-borde bg-superficie p-4 text-left transition-colors hover:border-texto"
      >
        <Icono nombre={icono} className="mt-0.5 h-5 w-5 shrink-0 text-texto-tenue" />
        <span className="min-w-0">
          <span className="block text-base font-medium text-texto">{titulo}</span>
          <span className="mt-0.5 block text-sm text-texto-tenue">{texto}</span>
        </span>
      </button>
    );
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-borde bg-fondo-sutil/50 p-4">
        <h2 className="text-base font-semibold text-texto">¿Qué querés armar?</h2>
        {opcion(
          "proyecto",
          "Un proyecto con roles",
          "Una obra, un corto, una película… con los roles que buscás.",
          "tablero",
        )}
        {opcion(
          "equipo",
          "Armar equipo",
          "Juntar gente con ganas de crear como vos; la idea puede surgir en el camino.",
          "corazon",
        )}
        <button
          type="button"
          onClick={() => setPaso("cerrado")}
          className="self-start text-sm font-medium text-texto-tenue hover:text-texto"
        >
          Cancelar
        </button>
      </section>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPaso("elegir")}
      className="brillo-accion flex w-full items-center justify-center gap-1.5 rounded-full bg-accion px-4 py-3 text-sm font-semibold text-accion-texto transition hover:brightness-110"
    >
      <Icono nombre="mas" className="h-4 w-4" />
      Crear proyecto
    </button>
  );
}
