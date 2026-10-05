"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sugerirHabilidades } from "@/app/acciones-ia";
import { etiquetaHabilidad } from "@/lib/constantes";

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
  const t = useTranslations("perfil.sugerirHabilidades");
  const tEtiquetas = useTranslations("perfil.etiquetas");
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
        return setAviso(r.habilidades.length > 0 ? t("yaMarcadas") : t("ninguna"));
      }
      onMarcar((prev) => [...prev, ...r.habilidades.filter((h) => !prev.includes(h))]);
      setAviso(t("marcamos", { lista: nuevas.map((h) => etiquetaHabilidad(h, tEtiquetas)).join(", ") }));
    } catch {
      setAviso(t("error"));
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
        {pensando ? t("leyendo") : t("boton")}
      </button>
      {aviso && <p className="text-xs text-texto-tenue">{aviso}</p>}
    </div>
  );
}
