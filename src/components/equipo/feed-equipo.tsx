"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Icono } from "@/components/ui/icono";
import { etiquetaDisciplina } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

export interface PersonaEquipo {
  perfil_id: string;
  nombre: string;
  pitch: string | null;
  ubicacion_publica: string | null;
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
  habilidades: string[];
  imagen_url: string | null;
  es_talento: boolean;
  es_creador: boolean;
  distancia_metros: number | null;
}

/**
 * Feed de personas para armar equipo. Es el mismo gesto que el feed de convocatorias pero
 * sin obra de por medio: acá no te postulás a nada, decís que te interesa alguien.
 *
 * El interés es recíproco y a ciegas: nadie sabe quién lo marcó hasta que la elección coincide.
 * Saberlo antes cambiaría la decisión, y con eso se pierde el sentido del match mutuo.
 */
export function FeedEquipo({ personasIniciales }: { personasIniciales: PersonaEquipo[] }) {
  const router = useRouter();
  const [personas, setPersonas] = useState(personasIniciales);
  const [error, setError] = useState<string | null>(null);

  const actual = personas[0];

  async function decidir(persona: PersonaEquipo, interesa: boolean) {
    setError(null);
    const anterior = personas;
    // Optimista: la tarjeta se va al toque y la decisión se persiste atrás, igual que el
    // swipe del feed de convocatorias.
    setPersonas((prev) => prev.slice(1));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: errorBd } = await supabase.from("intereses_equipo").insert({
      de_perfil: user.id,
      a_perfil: persona.perfil_id,
      interesa,
    });

    if (errorBd) {
      setPersonas(anterior);
      setError("No pudimos guardar tu decisión. Probá de nuevo.");
      return;
    }

    // Si el interés era recíproco, el trigger ya creó la sala y dejó el aviso.
    if (interesa) router.refresh();
  }

  if (!actual) {
    return (
      <EstadoVacio
        icono="perfil"
        titulo="Por ahora no hay nadie más"
        detalle="Cuando otras personas se anoten para armar equipo van a aparecer acá. Volvé en unos días."
      />
    );
  }

  const oficios = [
    ...actual.disciplinas.map((d) => (d === "otro" ? actual.otro_detalle : etiquetaDisciplina(d))),
    ...actual.habilidades,
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      {error && <p className="mb-3 text-xs text-error-600">{error}</p>}

      <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-tarjeta">
        <div className="flex items-center gap-3.5">
          {actual.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={actual.imagen_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-ink-500">
              {actual.nombre[0]}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-ink-900">
              {actual.nombre}
            </h2>
            <p className="text-sm text-ink-500">
              {actual.ubicacion_publica}
              {actual.distancia_metros !== null &&
                ` · a ${Math.max(1, Math.round(actual.distancia_metros / 1000))} km`}
            </p>
          </div>
        </div>

        {actual.pitch && (
          <p className="mt-4 text-base leading-relaxed text-ink-800">{actual.pitch}</p>
        )}

        {oficios.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {oficios.map((o) => (
              <li
                key={o}
                className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-600"
              >
                {o}
              </li>
            ))}
          </ul>
        )}
      </article>

      <div className="mx-auto mt-7 flex items-center gap-5">
        <button
          type="button"
          onClick={() => decidir(actual, false)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-900"
          aria-label="Paso"
        >
          <Icono nombre="cruz" className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => decidir(actual, true)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-tarjeta transition-colors hover:bg-brand-600"
          aria-label="Me interesa"
        >
          <Icono nombre="corazon" className="h-7 w-7" relleno />
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-ink-400">
        {personas.length} {personas.length === 1 ? "persona" : "personas"} por ver
      </p>
    </div>
  );
}
