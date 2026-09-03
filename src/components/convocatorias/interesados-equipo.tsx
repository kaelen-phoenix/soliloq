"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Imagen } from "@/components/ui/imagen";
import { createClient } from "@/lib/supabase/client";

export interface Interesado {
  perfil_id: string;
  nombre: string;
  foto_url: string | null;
  ubicacion_publica: string | null;
  aceptado: boolean;
}

/**
 * El creador ve quién se interesó en su equipo y acepta hasta llenar el cupo (issue #57).
 * Al aceptar, `aceptar_en_equipo` (0046) suma a la persona a la sala del equipo.
 */
export function InteresadosEquipo({
  equipoId,
  cupo,
  interesadosIniciales,
}: {
  equipoId: string;
  cupo: number;
  interesadosIniciales: Interesado[];
}) {
  const router = useRouter();
  const [interesados, setInteresados] = useState(interesadosIniciales);
  const [error, setError] = useState<string | null>(null);
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);

  const aceptados = interesados.filter((i) => i.aceptado).length;
  const cupoLleno = aceptados >= cupo;

  async function aceptar(perfilId: string) {
    setError(null);
    setAceptandoId(perfilId);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("aceptar_en_equipo", {
      p_equipo_id: equipoId,
      p_talento_id: perfilId,
    });
    setAceptandoId(null);
    if (err) {
      setError(
        err.message.includes("cupo")
          ? "Ya llenaste el cupo del equipo."
          : "No pudimos aceptar a esta persona. Probá de nuevo."
      );
      return;
    }
    setInteresados((prev) =>
      prev.map((i) => (i.perfil_id === perfilId ? { ...i, aceptado: true } : i))
    );
    router.refresh();
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-texto">
        Interesados{" "}
        <span className="font-normal text-texto-tenue">
          — {aceptados} de {cupo} {cupo === 1 ? "lugar" : "lugares"}
        </span>
      </p>

      {interesados.length === 0 ? (
        <p className="mt-2 text-sm text-texto-tenue">Todavía nadie mostró interés.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {interesados.map((i) => (
            <li
              key={i.perfil_id}
              className="flex items-center gap-3 rounded-xl border border-borde p-2.5"
            >
              {i.foto_url ? (
                <Imagen
                  src={i.foto_url}
                  alt={i.nombre}
                  width={40}
                  height={40}
                  contenedorClassName="shrink-0 rounded-full"
                  fallback={
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue">
                      {i.nombre[0]}
                    </span>
                  }
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue">
                  {i.nombre[0]}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-texto">{i.nombre}</p>
                {i.ubicacion_publica && (
                  <p className="truncate text-xs text-texto-tenue">{i.ubicacion_publica}</p>
                )}
              </div>
              {i.aceptado ? (
                <span className="shrink-0 text-xs font-medium text-exito-600">Aceptado</span>
              ) : (
                <button
                  type="button"
                  onClick={() => aceptar(i.perfil_id)}
                  disabled={cupoLleno || aceptandoId !== null}
                  className="shrink-0 rounded-lg bg-accion px-3 py-1.5 text-xs font-medium text-accion-texto transition-colors hover:opacity-90 disabled:opacity-40"
                >
                  {aceptandoId === i.perfil_id ? "…" : "Aceptar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
    </div>
  );
}
