"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

/**
 * El paso intermedio cuando te eligen para una postulación vieja.
 *
 * Existe porque una persona que se postuló hace semanas puede haberse comprometido con otra
 * obra, y enterarse de que "hay equipo" por un chat que se abrió solo es la forma más rápida
 * de que un elenco arranque con alguien que ya no está. Confirmar convierte la postulación
 * en un compromiso explícito.
 *
 * Rechazar no es un fracaso y por eso no se pinta como error: libera la vacante para que el
 * creador siga buscando, que es lo mejor que puede pasar si la persona ya no está.
 */
export function ConfirmarConvocatoria({
  postulacionId,
  obraTitulo,
}: {
  postulacionId: string;
  obraTitulo: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"aprobado" | "rechazado" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function responder(estado: "aprobado" | "rechazado") {
    setEnviando(estado);
    setError(null);

    const supabase = createClient();
    const { error: errorBd } = await supabase
      .from("postulaciones")
      .update({ estado })
      .eq("id", postulacionId);

    if (errorBd) {
      setEnviando(null);
      // El cupo se controla con bloqueo de fila en el trigger: entre que te convocaron y
      // que confirmás, el rol puede haberse llenado con otra persona.
      setError(
        errorBd.message.includes("vacante")
          ? "Mientras tanto el rol se cubrió con otra persona."
          : "No pudimos guardar tu respuesta. Probá de nuevo."
      );
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3.5">
      <p className="text-[14px] font-medium text-ink-900">¡Fuiste convocado!</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
        Te quieren sumar al equipo de <span className="font-medium">{obraTitulo}</span>. Como tu
        postulación tiene más de una semana, necesitamos confirmar que seguís disponible.
      </p>

      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Boton
          onClick={() => responder("aprobado")}
          cargando={enviando === "aprobado"}
          textoCargando="Confirmando…"
          className="flex-1"
        >
          Confirmar
        </Boton>
        <button
          type="button"
          onClick={() => responder("rechazado")}
          disabled={enviando !== null}
          className="rounded-xl border border-ink-200 px-4 text-[13px] font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900 disabled:opacity-50"
        >
          Ya no puedo
        </button>
      </div>
    </div>
  );
}
