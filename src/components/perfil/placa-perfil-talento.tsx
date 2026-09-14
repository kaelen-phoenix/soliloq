"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Superposicion } from "@/components/ui/superposicion";
import { PerfilTalentoDetalle, type TalentoDetalle } from "@/components/perfil/perfil-talento-detalle";

/**
 * Placa de perfil reutilizable: sala de chat (#149) y Call Back / Convocados (#151). Pide
 * el perfil client-side en vez de navegar a `/talentos/[id]`, así quien mira no pierde el
 * contexto (la conversación, la posición en la lista). RLS resuelve el acceso según por qué
 * corresponda verlo (compañero de sala, match, o el buscador de talento) — no hace falta que
 * este componente sepa cuál aplica.
 */
export function PlacaPerfilTalento({
  talentoId,
  onCerrar,
  textoBoton = "Cerrar",
}: {
  talentoId: string;
  onCerrar: () => void;
  /** #149 pide "Aceptar" en la sala de chat; #151 pide "Cerrar" en Call Back. */
  textoBoton?: string;
}) {
  const [talento, setTalento] = useState<TalentoDetalle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const supabase = createClient();
      const [{ data: perfil }, { data: fotos }] = await Promise.all([
        supabase.from("perfiles_talento").select("*").eq("id", talentoId).single(),
        supabase.from("fotos_talento").select("*").eq("talento_id", talentoId).order("orden"),
      ]);
      if (cancelado) return;
      if (!perfil) {
        setError(true);
        return;
      }
      setTalento({
        ...perfil,
        fotos: (fotos ?? []).map((f) => ({
          id: f.id,
          orden: f.orden,
          url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
        })),
      });
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [talentoId]);

  return (
    <Superposicion onCerrar={onCerrar} posicion="abajo" etiqueta="Perfil del Talento">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-t-2xl bg-superficie p-5 sm:rounded-2xl sm:shadow-tarjeta">
        {error ? (
          <p className="py-6 text-center text-sm text-texto-tenue">No pudimos cargar este perfil.</p>
        ) : !talento ? (
          <p className="py-6 text-center text-sm text-texto-tenue">Cargando…</p>
        ) : (
          <PerfilTalentoDetalle talento={talento} />
        )}

        <button
          type="button"
          onClick={onCerrar}
          className="mt-4 w-full shrink-0 rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto"
        >
          {textoBoton}
        </button>
      </div>
    </Superposicion>
  );
}
