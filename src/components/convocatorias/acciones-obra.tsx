"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { ConfirmarBorrado } from "@/components/ui/confirmar-borrado";
import type { EstadoObra } from "@/lib/supabase/types";

const MIN_FOTOS = 3;

export function AccionesObra({
  obraId,
  estado,
  cantidadRoles,
  cantidadFotos,
  esDueno,
  fotosPaths,
}: {
  obraId: string;
  estado: EstadoObra;
  cantidadRoles: number;
  cantidadFotos: number;
  esDueno: boolean;
  /** `storage_path` de cada foto de la obra, para limpiarlas del Storage al borrar. */
  fotosPaths: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

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

  async function borrar() {
    setError(null);
    setCargando(true);
    const supabase = createClient();
    // Primero el Storage (no cascadea con la fila); si algo falla, seguimos igual con el
    // borrado de la obra — no queremos dejar el proyecto a medio eliminar por un huérfano.
    if (fotosPaths.length > 0) {
      await supabase.storage.from("fotos-perfil").remove(fotosPaths);
    }
    const { error: errorBd } = await supabase.from("obras").delete().eq("id", obraId);
    if (errorBd) {
      setCargando(false);
      setError("No se pudo borrar el proyecto. Probá de nuevo.");
      return;
    }
    // Sin `setCargando(false)`: la pantalla ya se va.
    router.replace("/");
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
        {estado === "cerrada" && (
          <p className="text-sm text-texto-tenue">Esta convocatoria está cerrada.</p>
        )}
      </div>

      {esDueno && (
        <div className="mt-4 border-t border-borde pt-4">
          {!confirmarBorrado ? (
            <Boton
              variante="fantasma"
              className="!px-0 text-error-600 hover:!bg-transparent hover:underline"
              onClick={() => {
                setError(null);
                setConfirmarBorrado(true);
              }}
            >
              Borrar proyecto
            </Boton>
          ) : (
            <ConfirmarBorrado
              mensaje="Se borra el proyecto con sus roles, fotos y postulaciones. No se puede deshacer. Escribí BORRAR para confirmar."
              textoBoton="Borrar definitivamente"
              cargando={cargando}
              onConfirmar={borrar}
              onCancelar={() => setConfirmarBorrado(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
