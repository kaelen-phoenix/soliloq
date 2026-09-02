"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvisoGuardado, useAvisoGuardado } from "@/components/ui/aviso-guardado";
import { Boton } from "@/components/ui/boton";

const MAX_PITCH = 280;

/**
 * Anotarse para que te encuentren sin que haya un proyecto de por medio.
 *
 * Es opt-in explícito y no un default: aparecer en un feed de personas es una decisión, no
 * algo que le pasa a quien se creó un perfil para postularse a convocatorias.
 */
export function BuscarEquipo({
  buscaEquipo,
  pitchInicial,
}: {
  buscaEquipo: boolean;
  pitchInicial: string | null;
}) {
  const router = useRouter();
  const [activo, setActivo] = useState(buscaEquipo);
  const [pitch, setPitch] = useState(pitchInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useAvisoGuardado();

  async function guardar(nuevoActivo: boolean) {
    setGuardando(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: errorBd } = await supabase
      .from("perfiles")
      .update({ busca_equipo: nuevoActivo, pitch: pitch.trim() || null })
      .eq("id", user.id);

    setGuardando(false);

    if (errorBd) {
      setActivo(!nuevoActivo);
      setError("No pudimos guardar el cambio. Probá de nuevo.");
      return;
    }

    setActivo(nuevoActivo);
    setGuardado(true);
    router.refresh();
  }

  return (
    <section className="mt-8 max-w-2xl rounded-2xl border border-borde p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-texto">Armar equipo</h2>
          <p className="mt-1 text-sm leading-relaxed text-texto-tenue">
            Para conocer gente sin tener un proyecto todavía. Si lo activás, aparecés en el
            feed de personas con tu nombre, tu ciudad y lo que escribas acá abajo.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={activo}
          disabled={guardando}
          onClick={() => guardar(!activo)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            activo ? "bg-brand-500" : "bg-ink-200"
          }`}
        >
          <span className="sr-only">Aparecer en el feed de personas</span>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-superficie transition-transform ${
              activo ? "translate-x-[1.375rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {activo && (
        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="pitch" className="text-sm font-medium text-texto">
            ¿Qué querés hacer?
          </label>
          <textarea
            id="pitch"
            rows={3}
            maxLength={MAX_PITCH}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Soy iluminador, tengo tiempo libre y ganas de armar algo con gente que recién empieza."
            className="rounded-xl border border-borde px-3.5 py-2.5 text-base outline-none focus:border-ink-900"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xs text-ink-400">
              {pitch.length}/{MAX_PITCH}
            </span>
            <Boton onClick={() => guardar(true)} cargando={guardando} textoCargando="Guardando…">
              Guardar
            </Boton>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
      <AvisoGuardado visible={guardado} />
    </section>
  );
}
