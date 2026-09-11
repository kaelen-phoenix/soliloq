"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PerfilTalentoDetalle, type TalentoDetalle } from "@/components/perfil/perfil-talento-detalle";

/**
 * La placa de perfil dentro de la sala (issue #149): el Creador —o cualquier compañero de
 * sala— identifica a quién le escribe sin salir del chat. La política `comparte_sala_con`
 * (0001+) ya deja leer `perfiles_talento` de cualquiera que esté en la misma sala, así que
 * se pide acá mismo en vez de navegar a `/talentos/[id]`.
 */
export function PlacaPerfilTalento({ talentoId, onCerrar }: { talentoId: string; onCerrar: () => void }) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-t-2xl bg-superficie p-5 sm:rounded-2xl sm:shadow-tarjeta">
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
          Aceptar
        </button>
      </div>
    </div>
  );
}
