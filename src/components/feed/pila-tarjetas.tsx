"use client";

import { useMemo, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { TarjetaRol, type RolFeed } from "./tarjeta-rol";

const UMBRAL_SWIPE = 120;

export function PilaTarjetas({
  talentoId,
  locacionPropia,
  rolesIniciales,
}: {
  talentoId: string;
  locacionPropia: string | null;
  rolesIniciales: RolFeed[];
}) {
  const [roles, setRoles] = useState(rolesIniciales);
  const [indice, setIndice] = useState(0);
  const [filtrarPorLocacion, setFiltrarPorLocacion] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const controles = useAnimation();

  const visibles = useMemo(() => {
    const desdeIndice = roles.slice(indice);
    if (!filtrarPorLocacion || !locacionPropia) return desdeIndice;
    return desdeIndice.filter((r) => r.locacion_ensayos === locacionPropia);
  }, [roles, indice, filtrarPorLocacion, locacionPropia]);

  const actual = visibles[0];
  const siguiente = visibles[1];

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
      {locacionPropia && (
        <button
          type="button"
          onClick={() => setFiltrarPorLocacion((v) => !v)}
          className={`mb-4 self-start rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            filtrarPorLocacion
              ? "border-ink-900 bg-ink-900 text-white"
              : "border-ink-200 text-ink-500 hover:border-ink-300"
          }`}
        >
          Solo en {locacionPropia}
        </button>
      )}

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
            <p className="mt-3 text-[15px] font-medium text-ink-900">No hay convocatorias nuevas</p>
            <p className="mt-1 text-[13px] text-ink-500">Volvé más tarde a ver nuevas propuestas.</p>
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
