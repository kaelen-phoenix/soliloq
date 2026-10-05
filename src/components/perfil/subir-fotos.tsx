"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { comprimirImagen, ErrorImagen } from "@/lib/comprimir-imagen";
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
// #311: con una foto alcanza para empezar; se recomiendan tres.
export const MIN_FOTOS = 1;
export const FOTOS_RECOMENDADAS = 3;

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
  /** Acepta la lista nueva o una función sobre la anterior (como un `setState`): mientras se
   *  suben varias, otra foto puede llegar por otro lado (la de Google) y no se tiene que pisar. */
  onCambio: (fotos: FotoTalento[] | ((prev: FotoTalento[]) => FotoTalento[])) => void;
  persistir: boolean;
}) {
  const t = useTranslations("perfil.fotos");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);

  /** Sube un archivo y devuelve la foto, o el motivo por el que no se pudo. */
  async function subirUna(archivo: File, orden: number): Promise<FotoTalento | string> {
    if (!TIPOS_ADMITIDOS.includes(archivo.type)) return t("tiposAdmitidos");

    // Si la foto pesa o mide de más, se comprime acá en vez de rechazarla.
    let foto: File;
    try {
      foto = await comprimirImagen(archivo, { maxBytes: MAX_BYTES });
    } catch (e) {
      return e instanceof ErrorImagen
        ? tEtiquetas(`imagen.${e.clave}`, e.valores)
        : tEtiquetas("imagen.noSeProcesa");
    }

    const supabase = createClient();
    const extension = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const ruta = `${talentoId}/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage
      .from("fotos-perfil")
      .upload(ruta, foto, { contentType: foto.type });
    if (errorSubida) return t("errorSubir");

    const url = supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl;
    if (!persistir) return { id: crypto.randomUUID(), storage_path: ruta, orden, url, enBd: false };

    const { data: fila, error: errorInsert } = await supabase
      .from("fotos_talento")
      .insert({ talento_id: talentoId, storage_path: ruta, orden })
      .select()
      .single();
    if (errorInsert || !fila) {
      await supabase.storage.from("fotos-perfil").remove([ruta]);
      return t("errorGuardar");
    }
    return { id: fila.id, storage_path: ruta, orden, url, enBd: true };
  }

  // #301: se pueden elegir varias a la vez; se suben de a una, hasta llenar el máximo.
  async function agregarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0) return;
    setError(null);

    const lugares = MAX_FOTOS - fotos.length;
    if (lugares <= 0) {
      setError(t("maximo", { max: MAX_FOTOS }));
      return;
    }

    setSubiendo(true);
    let actuales = fotos;
    let problema: string | null =
      archivos.length > lugares
        ? t("subimosAlgunas", { lugares, total: archivos.length, max: MAX_FOTOS })
        : null;
    for (const archivo of archivos.slice(0, lugares)) {
      // max + 1: evita reusar el orden de una foto borrada del medio.
      const orden = actuales.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
      const r = await subirUna(archivo, orden);
      if (typeof r === "string") {
        problema = r;
        continue;
      }
      actuales = [...actuales, r];
      onCambio((prev) => {
        if (prev.length >= MAX_FOTOS) return prev;
        // En el alta (sin fila en la base todavía) el orden se recalcula sobre lo que hay.
        const ordenFinal = persistir ? r.orden : prev.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
        return [...prev, { ...r, orden: ordenFinal }];
      });
    }
    setSubiendo(false);
    setError(problema);
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
              alt={t("altFoto")}
              fill
              absoluto
              sizes="(max-width: 640px) 33vw, 200px"
            />
            {indice === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/75 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                {t("principal")}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink-950/80 to-transparent px-1.5 pb-1.5 pt-4">
              {indice !== 0 && (
                <button
                  type="button"
                  onClick={() => hacerPrincipal(foto)}
                  className="text-2xs font-medium text-white/90 hover:text-white"
                >
                  {t("principal")}
                </button>
              )}
              <button
                type="button"
                onClick={() => eliminarFoto(foto)}
                className="ml-auto text-2xs font-medium text-white/90 hover:text-white"
              >
                {t("eliminar")}
              </button>
            </div>
          </div>
        ))}

        {fotos.length < MAX_FOTOS && (
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 text-texto-tenue transition-colors hover:border-texto hover:text-texto">
            <Icono nombre="mas" className="h-5 w-5" />
            <span className="text-2xs font-medium">{subiendo ? t("subiendo") : t("agregar")}</span>
            <input
              type="file"
              accept={TIPOS_ADMITIDOS.join(",")}
              className="hidden"
              multiple
              onChange={agregarFotos}
              disabled={subiendo}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-error-600">{error}</p>}
      <p className="text-xs text-texto-tenue">
        {t("contador", { n: fotos.length, max: MAX_FOTOS })}
      </p>
    </div>
  );
}
