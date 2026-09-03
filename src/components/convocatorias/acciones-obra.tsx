"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import type { EstadoObra } from "@/lib/supabase/types";

const MIN_FOTOS = 3;

export function AccionesObra({
  obraId,
  estado,
  cantidadRoles,
  cantidadFotos,
}: {
  obraId: string;
  estado: EstadoObra;
  cantidadRoles: number;
  cantidadFotos: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function publicar() {
    setError(null);
    if (cantidadRoles === 0) {
      setError("Definí al menos un rol antes de publicar.");
      return;
    }
    if (cantidadFotos < MIN_FOTOS) {
      setError(`Subí al menos ${MIN_FOTOS} fotos antes de publicar.`);
      return;
    }
    setCargando(true);
    const supabase = createClient();
    await supabase.from("obras").update({ estado: "publicada" }).eq("id", obraId);
    setCargando(false);
    router.refresh();
  }

  async function cerrar() {
    setCargando(true);
    const supabase = createClient();
    await supabase.from("obras").update({ estado: "cerrada" }).eq("id", obraId);
    setCargando(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-error-600">{error}</p>}
      <div className="flex gap-2">
        {estado === "borrador" && (
          <Boton onClick={publicar} cargando={cargando}>
            Publicar convocatoria
          </Boton>
        )}
        {estado === "publicada" && (
          <Boton variante="peligro" onClick={cerrar} cargando={cargando}>
            Cerrar convocatoria
          </Boton>
        )}
        {estado === "cerrada" && <p className="text-sm text-texto-tenue">Esta convocatoria está cerrada.</p>}
      </div>
    </div>
  );
}
