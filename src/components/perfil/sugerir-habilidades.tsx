"use client";

import { useState } from "react";
import { sugerirHabilidades } from "@/app/acciones-ia";

/**
 * «✨ Sugerir desde mi experiencia» (#320): la IA lee la Experiencia y marca las habilidades
 * de la lista que aparecen ahí. Solo suma marcas (no saca ninguna) y avisa cuáles, para que
 * la persona las revise antes de guardar.
 */
export function SugerirHabilidades({
  experiencia,
  marcadas,
  onMarcar,
}: {
  experiencia: string;
  marcadas: string[];
  /** Como un `setState`: suma sobre lo marcado en ese momento, aunque haya cambiado mientras. */
  onMarcar: (actualizar: (prev: string[]) => string[]) => void;
}) {
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function pedir() {
    setPensando(true);
    setAviso(null);
    try {
      const r = await sugerirHabilidades(experiencia);
      if (!r.ok) return setAviso(r.error);
      const nuevas = r.habilidades.filter((h) => !marcadas.includes(h));
      if (nuevas.length === 0) {
        return setAviso(
          r.habilidades.length > 0
            ? "Ya tenías marcadas las que aparecen en tu experiencia."
            : "No encontramos habilidades de la lista en tu experiencia.",
        );
      }
      onMarcar((prev) => [...prev, ...r.habilidades.filter((h) => !prev.includes(h))]);
      setAviso(`Marcamos: ${nuevas.join(", ")}. Revisalas antes de guardar.`);
    } catch {
      setAviso("No pudimos sugerirlas ahora. Probá de nuevo.");
    } finally {
      setPensando(false);
    }
  }

  if (experiencia.trim().length < 15) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={pedir}
        disabled={pensando}
        className="self-start rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
      >
        {pensando ? "Leyendo tu experiencia…" : "✨ Sugerir desde mi experiencia"}
      </button>
      {aviso && <p className="text-xs text-texto-tenue">{aviso}</p>}
    </div>
  );
}
