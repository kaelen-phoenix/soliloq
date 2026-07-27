"use client";

import { useMemo, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { opcionesDeRadio, radioMasCercano, type UnidadDistancia } from "@/lib/ubicacion";
import { TarjetaRol, type RolFeed } from "./tarjeta-rol";

const UMBRAL_SWIPE = 120;

export function PilaTarjetas({
  talentoId,
  radioInicialMetros,
  unidadInicial,
  rolesIniciales,
}: {
  talentoId: string;
  radioInicialMetros: number | null;
  unidadInicial: UnidadDistancia;
  rolesIniciales: RolFeed[];
}) {
  const [roles, setRoles] = useState(rolesIniciales);
  const [indice, setIndice] = useState(0);
  const [radio, setRadio] = useState<number | null>(radioInicialMetros);
  const [unidad, setUnidad] = useState<UnidadDistancia>(unidadInicial);
  const [recargando, setRecargando] = useState(false);
  // Solo se averigua cuando el feed queda vacío: sirve para no confundir "no llegás" con
  // "ya viste todo".
  const [hayFueraDelRadio, setHayFueraDelRadio] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const controles = useAnimation();

  // El filtro por distancia y por género ya vino resuelto de Postgres; acá solo se avanza.
  const visibles = useMemo(() => roles.slice(indice), [roles, indice]);

  const actual = visibles[0];
  const siguiente = visibles[1];

  const opciones = opcionesDeRadio(unidad);
  const opcionActual = radioMasCercano(radio, unidad);

  /**
   * Cambiar el radio es volver a pedir el feed, no filtrar lo que ya está en memoria:
   * filtrar en el navegador obligaría a traerse todos los roles del mundo para descartarlos.
   */
  async function recargar(nuevoRadio: number | null, nuevaUnidad: UnidadDistancia) {
    setRecargando(true);
    setAvisoError(null);
    const supabase = createClient();

    await supabase
      .from("perfiles_talento")
      .update({ radio_busqueda_metros: nuevoRadio, unidad_distancia: nuevaUnidad })
      .eq("id", talentoId);

    const { data, error } = await supabase.rpc("feed_para_talento", {
      p_talento_id: talentoId,
      p_radio_metros: nuevoRadio,
    });

    if (error) {
      setRecargando(false);
      setAvisoError("No pudimos actualizar el feed. Probá de nuevo.");
      return;
    }

    const nuevos = data ?? [];
    setRoles(nuevos);
    setIndice(0);

    // La consulta de más se paga únicamente en el caso vacío, que es el único donde hay algo
    // que explicar.
    if (nuevos.length === 0 && nuevoRadio !== null) {
      const { data: sinRadio } = await supabase.rpc("feed_para_talento", {
        p_talento_id: talentoId,
        p_radio_metros: null,
      });
      setHayFueraDelRadio((sinRadio ?? []).length > 0);
    } else {
      setHayFueraDelRadio(false);
    }

    setRecargando(false);
  }

  function cambiarRadio(metros: number | null) {
    setRadio(metros);
    recargar(metros, unidad);
  }

  function cambiarUnidad(nueva: UnidadDistancia) {
    // El radio en metros no se convierte ni se toca: cambia cómo se lee, no qué se busca.
    setUnidad(nueva);
    recargar(radio, nueva);
  }

  async function registrarDecision(rol: RolFeed, decision: "postular" | "descartar") {
    const supabase = createClient();
    const tabla = decision === "postular" ? "postulaciones" : "descartes";
    const { error } = await supabase
      .from(tabla)
      .upsert(
        { rol_id: rol.rol_id, talento_id: talentoId },
        { onConflict: "rol_id,talento_id", ignoreDuplicates: true }
      );

    if (error) {
      setAvisoError(
        decision === "postular"
          ? "No pudimos registrar tu postulación. Probá de nuevo."
          : "No pudimos guardar el descarte. Probá de nuevo."
      );
      setRoles((prev) => [rol, ...prev]);
    }
  }

  function avanzar(rol: RolFeed, decision: "postular" | "descartar") {
    setAvisoError(null);
    setIndice((i) => i + 1);
    controles.set({ x: 0, rotate: 0 });
    registrarDecision(rol, decision);
  }

  async function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!actual) return;
    if (info.offset.x > UMBRAL_SWIPE) {
      await controles.start({ x: 500, rotate: 12, transition: { duration: 0.18 } });
      avanzar(actual, "postular");
    } else if (info.offset.x < -UMBRAL_SWIPE) {
      await controles.start({ x: -500, rotate: -12, transition: { duration: 0.18 } });
      avanzar(actual, "descartar");
    } else {
      controles.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  }

  return (
    <main className="flex flex-col px-5 py-4">
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="radio" className="text-[11px] font-medium text-ink-400">
          Distancia
        </label>
        <select
          id="radio"
          value={opcionActual.metros ?? ""}
          disabled={recargando}
          onChange={(e) => cambiarRadio(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 focus:border-ink-900"
        >
          {opciones.map((o) => (
            <option key={o.etiqueta} value={o.metros ?? ""}>
              {o.etiqueta}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-ink-200">
          {(["km", "mi"] as const).map((u) => (
            <button
              key={u}
              type="button"
              disabled={recargando}
              onClick={() => cambiarUnidad(u)}
              className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                unidad === u ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {avisoError && <p className="mb-3 text-xs text-red-600">{avisoError}</p>}

      <div className="relative mx-auto h-[500px] w-full max-w-sm">
        {siguiente && (
          <div className="absolute inset-0 scale-[0.96] opacity-40 blur-[0.5px]">
            <TarjetaRol rol={siguiente} />
          </div>
        )}

        {actual ? (
          <motion.div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            animate={controles}
            onDragEnd={onDragEnd}
          >
            <TarjetaRol rol={actual} />
          </motion.div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 px-10 text-center">
            <Icono nombre="feed" className="h-8 w-8 text-ink-300" />
            {hayFueraDelRadio ? (
              <>
                <p className="mt-3 text-[15px] font-medium text-ink-900">
                  No hay convocatorias tan cerca
                </p>
                <p className="mt-1 text-[13px] text-ink-500">
                  Hay convocatorias más lejos de {opcionActual.etiqueta}. Ampliá la distancia para
                  verlas.
                </p>
                <button
                  type="button"
                  onClick={() => cambiarRadio(null)}
                  className="mt-4 rounded-lg border border-ink-900 px-3 py-1.5 text-[12px] font-medium text-ink-900"
                >
                  Buscar en todo el mundo
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-[15px] font-medium text-ink-900">
                  No hay convocatorias nuevas
                </p>
                <p className="mt-1 text-[13px] text-ink-500">
                  Volvé más tarde a ver nuevas propuestas.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {actual && (
        <div className="mx-auto mt-7 flex items-center gap-5">
          <button
            type="button"
            onClick={() => avanzar(actual, "descartar")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-900"
            aria-label="Descartar"
          >
            <Icono nombre="cruz" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => avanzar(actual, "postular")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-tarjeta transition-colors hover:bg-brand-600"
            aria-label="Postularme"
          >
            <Icono nombre="corazon" className="h-7 w-7" relleno />
          </button>
        </div>
      )}
    </main>
  );
}
