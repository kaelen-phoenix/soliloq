"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface FotoTalento {
  id: string;
  storage_path: string;
  orden: number;
  url: string;
}

const TIPOS_ADMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FOTOS = 5;
const MIN_FOTOS = 3;

export function SubirFotos({
  talentoId,
  fotos,
  onCambio,
}: {
  talentoId: string;
  fotos: FotoTalento[];
  onCambio: (fotos: FotoTalento[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function agregarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);

    if (fotos.length >= MAX_FOTOS) {
      setError(`El máximo es ${MAX_FOTOS} fotos.`);
      return;
    }
    if (!TIPOS_ADMITIDOS.includes(archivo.type)) {
      setError("Solo se admiten imágenes JPEG, PNG o WebP.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setSubiendo(true);
    const supabase = createClient();
    const extension = archivo.name.split(".").pop();
    const ruta = `${talentoId}/${crypto.randomUUID()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("fotos-perfil")
      .upload(ruta, archivo);

    if (errorSubida) {
      setSubiendo(false);
      setError("No pudimos subir la foto. Probá de nuevo.");
      return;
    }

    const siguienteOrden = fotos.length;
    const { data: fila, error: errorInsert } = await supabase
      .from("fotos_talento")
      .insert({ talento_id: talentoId, storage_path: ruta, orden: siguienteOrden })
      .select()
      .single();

    setSubiendo(false);

    if (errorInsert || !fila) {
      setError("No pudimos guardar la foto. Probá de nuevo.");
      return;
    }

    const { data: publica } = supabase.storage.from("fotos-perfil").getPublicUrl(ruta);
    onCambio([...fotos, { id: fila.id, storage_path: ruta, orden: siguienteOrden, url: publica.publicUrl }]);
  }

  async function eliminarFoto(foto: FotoTalento) {
    const supabase = createClient();
    await supabase.storage.from("fotos-perfil").remove([foto.storage_path]);
    await supabase.from("fotos_talento").delete().eq("id", foto.id);
    onCambio(fotos.filter((f) => f.id !== foto.id));
  }

  async function hacerPrincipal(foto: FotoTalento) {
    if (foto.orden === 0) return;
    const supabase = createClient();
    const anterior = fotos.find((f) => f.orden === 0);

    await supabase.from("fotos_talento").update({ orden: -1 }).eq("id", foto.id);
    if (anterior) {
      await supabase.from("fotos_talento").update({ orden: foto.orden }).eq("id", anterior.id);
    }
    await supabase.from("fotos_talento").update({ orden: 0 }).eq("id", foto.id);

    const reordenadas = fotos.map((f) => {
      if (f.id === foto.id) return { ...f, orden: 0 };
      if (anterior && f.id === anterior.id) return { ...f, orden: foto.orden };
      return f;
    });
    onCambio(reordenadas.sort((a, b) => a.orden - b.orden));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[...fotos]
          .sort((a, b) => a.orden - b.orden)
          .map((foto) => (
            <div key={foto.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="Foto de portfolio" className="h-full w-full object-cover" />
              {foto.orden === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  Principal
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                {foto.orden !== 0 && (
                  <button
                    type="button"
                    onClick={() => hacerPrincipal(foto)}
                    className="text-[10px] font-medium text-white"
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => eliminarFoto(foto)}
                  className="ml-auto text-[10px] font-medium text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

        {fotos.length < MAX_FOTOS && (
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-200 text-ink-500 hover:border-brand-400">
            <span className="text-2xl">＋</span>
            <span className="text-xs">{subiendo ? "Subiendo…" : "Agregar"}</span>
            <input type="file" accept={TIPOS_ADMITIDOS.join(",")} className="hidden" onChange={agregarFoto} disabled={subiendo} />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-ink-500">
        {fotos.length}/{MAX_FOTOS} fotos — mínimo {MIN_FOTOS} para completar el perfil.
      </p>
    </div>
  );
}
