"use client";

import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { createClient } from "@/lib/supabase/client";

export interface FotoTalento {
  /** Id de la fila en `fotos_talento`, o un id temporal de cliente si todavía no se persistió. */
  id: string;
  storage_path: string;
  orden: number;
  url: string;
  /** false mientras la foto vive solo en Storage, durante el alta del perfil. */
  enBd: boolean;
}

const TIPOS_ADMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FOTOS = 5;
export const MIN_FOTOS = 3;

/**
 * Persiste en `fotos_talento` las fotos que todavía solo existen en Storage.
 * Se llama recién después de crear el perfil, porque la FK exige que la fila de
 * `perfiles_talento` ya exista.
 */
export async function persistirFotosPendientes(talentoId: string, fotos: FotoTalento[]) {
  const pendientes = fotos.filter((f) => !f.enBd);
  if (pendientes.length === 0) return;

  const supabase = createClient();
  await supabase.from("fotos_talento").insert(
    pendientes.map((f) => ({
      talento_id: talentoId,
      storage_path: f.storage_path,
      orden: f.orden,
    }))
  );
}

export function SubirFotos({
  talentoId,
  fotos,
  onCambio,
  /** Durante el alta el perfil todavía no existe, así que no se puede insertar en la base. */
  persistir,
}: {
  talentoId: string;
  fotos: FotoTalento[];
  onCambio: (fotos: FotoTalento[]) => void;
  persistir: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);

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

    setSubiendo(true);

    // Si la foto pesa o mide de más, se comprime acá en vez de rechazarla.
    let foto: File;
    try {
      foto = await comprimirImagen(archivo, { maxBytes: MAX_BYTES });
    } catch (e) {
      setSubiendo(false);
      setError(e instanceof Error ? e.message : "No pudimos procesar la imagen.");
      return;
    }

    const supabase = createClient();
    const extension = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const ruta = `${talentoId}/${crypto.randomUUID()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("fotos-perfil")
      .upload(ruta, foto, { contentType: foto.type });

    if (errorSubida) {
      setSubiendo(false);
      setError("No pudimos subir la foto. Probá de nuevo.");
      return;
    }

    // max + 1: evita reusar el orden de una foto borrada del medio.
    const siguienteOrden = fotos.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
    const url = supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl;

    if (!persistir) {
      setSubiendo(false);
      onCambio([...fotos, { id: crypto.randomUUID(), storage_path: ruta, orden: siguienteOrden, url, enBd: false }]);
      return;
    }

    const { data: fila, error: errorInsert } = await supabase
      .from("fotos_talento")
      .insert({ talento_id: talentoId, storage_path: ruta, orden: siguienteOrden })
      .select()
      .single();

    setSubiendo(false);

    if (errorInsert || !fila) {
      await supabase.storage.from("fotos-perfil").remove([ruta]);
      setError("No pudimos guardar la foto. Probá de nuevo.");
      return;
    }

    onCambio([...fotos, { id: fila.id, storage_path: ruta, orden: siguienteOrden, url, enBd: true }]);
  }

  async function eliminarFoto(foto: FotoTalento) {
    const supabase = createClient();
    await supabase.storage.from("fotos-perfil").remove([foto.storage_path]);
    if (foto.enBd) {
      await supabase.from("fotos_talento").delete().eq("id", foto.id);
    }
    onCambio(fotos.filter((f) => f.id !== foto.id));
  }

  async function hacerPrincipal(foto: FotoTalento) {
    // Reordena poniendo la elegida primera y renumerando de forma contigua.
    const reordenadas = [foto, ...ordenadas.filter((f) => f.id !== foto.id)].map((f, i) => ({
      ...f,
      orden: i,
    }));
    onCambio(reordenadas);

    const supabase = createClient();
    await Promise.all(
      reordenadas
        .filter((f) => f.enBd)
        .map((f) => supabase.from("fotos_talento").update({ orden: f.orden }).eq("id", f.id))
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {ordenadas.map((foto, indice) => (
          <div key={foto.id} className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-ink-100">
            <Imagen
              src={foto.url}
              alt="Foto de portfolio"
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              contenedorClassName="absolute inset-0"
            />
            {indice === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/75 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                Principal
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink-950/80 to-transparent px-1.5 pb-1.5 pt-4">
              {indice !== 0 && (
                <button
                  type="button"
                  onClick={() => hacerPrincipal(foto)}
                  className="text-2xs font-medium text-white/90 hover:text-white"
                >
                  Principal
                </button>
              )}
              <button
                type="button"
                onClick={() => eliminarFoto(foto)}
                className="ml-auto text-2xs font-medium text-white/90 hover:text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {fotos.length < MAX_FOTOS && (
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 text-ink-400 transition-colors hover:border-ink-900 hover:text-ink-900">
            <Icono nombre="mas" className="h-5 w-5" />
            <span className="text-2xs font-medium">{subiendo ? "Subiendo…" : "Agregar"}</span>
            <input
              type="file"
              accept={TIPOS_ADMITIDOS.join(",")}
              className="hidden"
              onChange={agregarFoto}
              disabled={subiendo}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-error-600">{error}</p>}
      <p className="text-xs text-ink-500">
        {fotos.length}/{MAX_FOTOS} fotos — mínimo {MIN_FOTOS} para completar el perfil.
      </p>
    </div>
  );
}
