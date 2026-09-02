"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { EtiquetasDisciplina } from "@/components/perfil/etiquetas-disciplina";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface PersonaParaResponder {
  perfil_id: string;
  nombre: string;
  pitch: string | null;
  ubicacion_publica: string | null;
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
  habilidades: string[];
  es_talento: boolean;
  es_creador: boolean;
}

/**
 * Responder a quien contactó desde el enlace público del perfil. Mismo circuito que el
 * feed de armar equipo: el `insert` en `intereses_equipo` dispara `al_marcar_interes()`
 * (0033), que arma la sala porque el interés ya es mutuo.
 */
export function ResponderInteres({ persona }: { persona: PersonaParaResponder }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"inicial" | "cargando" | "hecho" | "error">("inicial");

  async function responder() {
    setEstado("cargando");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("intereses_equipo").insert({
      de_perfil: user.id,
      a_perfil: persona.perfil_id,
      interesa: true,
    });

    if (error) {
      setEstado("error");
      return;
    }
    setEstado("hecho");
    router.refresh();
  }

  if (estado === "hecho") {
    return (
      <div className="rounded-2xl border border-ink-100 p-5 text-center">
        <p className="text-base font-medium text-ink-900">¡Hay equipo!</p>
        <p className="mt-1 text-sm text-ink-500">Ya se abrió una sala para hablar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-tarjeta">
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
          {persona.nombre}
        </h1>
        {persona.ubicacion_publica && (
          <p className="text-sm text-ink-500">{persona.ubicacion_publica}</p>
        )}

        {persona.pitch && (
          <p className="mt-4 text-base leading-relaxed text-ink-800">{persona.pitch}</p>
        )}

        {persona.disciplinas.length > 0 && (
          <EtiquetasDisciplina
            disciplinas={persona.disciplinas}
            otroDetalle={persona.otro_detalle}
            className="mt-4"
          />
        )}

        {persona.habilidades.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {persona.habilidades.map((h) => (
              <li key={h} className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-600">
                {h}
              </li>
            ))}
          </ul>
        )}
      </article>

      <Boton onClick={responder} cargando={estado === "cargando"} textoCargando="Un momento…">
        Me interesa
      </Boton>
      {estado === "error" && (
        <p className="text-xs text-error-600">No pudimos guardar tu decisión. Probá de nuevo.</p>
      )}
    </div>
  );
}
