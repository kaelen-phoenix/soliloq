"use client";

import { useMemo, useState } from "react";
import { motion, useAnimation } from "framer-motion";
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
    if (decision === "postular") {
      const { error } = await supabase
        .from("postulaciones")
        .upsert({ rol_id: rol.rol_id, talento_id: talentoId }, { onConflict: "rol_id,talento_id", ignoreDuplicates: true });
      if (error) {
        setAvisoError("No pudimos registrar tu postulación. Probá de nuevo.");
        setRoles((prev) => [rol, ...prev]);
      }
    } else {
      const { error } = await supabase
        .from("descartes")
        .upsert({ rol_id: rol.rol_id, talento_id: talentoId }, { onConflict: "rol_id,talento_id", ignoreDuplicates: true });
      if (error) {
        setAvisoError("No pudimos guardar el descarte. Probá de nuevo.");
        setRoles((prev) => [rol, ...prev]);
      }
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
      await controles.start({ x: 500, rotate: 15, transition: { duration: 0.2 } });
      avanzar(actual, "postular");
    } else if (info.offset.x < -UMBRAL_SWIPE) {
      await controles.start({ x: -500, rotate: -15, transition: { duration: 0.2 } });
      avanzar(actual, "descartar");
    } else {
      controles.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 300 } });
    }
  }

  return (
    <main className="flex flex-col px-6 py-4">
      {locacionPropia && (
        <button
          type="button"
          onClick={() => setFiltrarPorLocacion((v) => !v)}
          className={`mb-3 self-start rounded-full border px-3 py-1.5 text-xs font-medium ${
            filtrarPorLocacion ? "border-brand-500 bg-brand-50 text-brand-600" : "border-ink-100 text-ink-500"
          }`}
        >
          📍 Solo en {locacionPropia}
        </button>
      )}

      {avisoError && <p className="mb-3 text-xs text-red-600">{avisoError}</p>}

      <div className="relative mx-auto h-[520px] w-full max-w-sm">
        {siguiente && (
          <div className="absolute inset-0 scale-[0.97] opacity-70">
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
          <div className="flex h-full flex-col items-center justify-center rounded-card border border-dashed border-ink-200 text-center">
            <p className="text-3xl">🎭</p>
            <p className="mt-2 font-medium text-ink-900">No hay convocatorias nuevas por ahora</p>
            <p className="mt-1 px-8 text-sm text-ink-500">Volvé más tarde a ver nuevas propuestas.</p>
          </div>
        )}
      </div>

      {actual && (
        <div className="mx-auto mt-6 flex gap-6">
          <button
            type="button"
            onClick={() => avanzar(actual, "descartar")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-100 bg-white text-2xl shadow"
            aria-label="Descartar"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => avanzar(actual, "postular")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-2xl text-white shadow"
            aria-label="Postularme"
          >
            ♥
          </button>
        </div>
      )}
    </main>
  );
}
