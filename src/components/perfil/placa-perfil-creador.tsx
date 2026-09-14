"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Superposicion } from "@/components/ui/superposicion";
import { PerfilCreadorDetalle, type CreadorDetalle } from "@/components/perfil/perfil-creador-detalle";

/**
 * Placa de perfil del Creador desde una tarjeta del feed (issue #159): el Talento consulta
 * quién propone el Proyecto o Equipo sin salir de la tarjeta que estaba mirando. `perfiles_creador`
 * tiene una política de lectura abierta a cualquier sesión (`perfil_creador_select_publico`),
 * así que se pide acá mismo en vez de navegar a `/creadores/[id]`.
 */
export function PlacaPerfilCreador({ creadorId, onCerrar }: { creadorId: string; onCerrar: () => void }) {
  const [creador, setCreador] = useState<CreadorDetalle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const supabase = createClient();
      const { data } = await supabase.from("perfiles_creador").select("*").eq("id", creadorId).single();
      if (cancelado) return;
      if (!data) {
        setError(true);
        return;
      }
      setCreador(data);
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [creadorId]);

  return (
    <Superposicion onCerrar={onCerrar} posicion="abajo" etiqueta="Perfil del Creador">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-t-2xl bg-superficie p-5 sm:rounded-2xl sm:shadow-tarjeta">
        {error ? (
          <p className="py-6 text-center text-sm text-texto-tenue">No pudimos cargar este perfil.</p>
        ) : !creador ? (
          <p className="py-6 text-center text-sm text-texto-tenue">Cargando…</p>
        ) : (
          <PerfilCreadorDetalle creador={creador} />
        )}

        <button
          type="button"
          onClick={onCerrar}
          className="mt-4 w-full shrink-0 rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto"
        >
          Aceptar
        </button>
      </div>
    </Superposicion>
  );
}
