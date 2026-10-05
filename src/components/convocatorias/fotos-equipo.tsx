"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { comprimirImagen, ErrorImagen } from "@/lib/comprimir-imagen";
import { createClient } from "@/lib/supabase/client";

export interface FotoEquipo {
  id: string;
  storage_path: string;
  orden: number;
  url: string;
}

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
// #330: el tope de 2 se sacó; 10 queda como resguardo de almacenamiento (igual que la base, 0101).
const MAX = 10;
export const MIN_FOTOS_EQUIPO = 1;

/**
 * Carga de fotos del "Armar equipo" del Creador (issue #57, tope ajustado en #162). Se
 * recomienda que sean de la persona que arma el equipo, ya que es quien propone. El equipo
 * ya existe cuando se sube una foto, así que siempre se persiste al toque (a diferencia del
 * alta de talento). La ruta arranca con el uid del creador para que la política de storage
 * de 0010 aplique.
 */
export function FotosEquipo({
  equipoId,
  creadorId,
  fotosIniciales,
}: {
  equipoId: string;
  creadorId: string;
  fotosIniciales: FotoEquipo[];
}) {
  const [fotos, setFotos] = useState(fotosIniciales);
  // #329: el resto de la pantalla (p. ej. «Publicar convocatoria») cuenta las fotos del
  // servidor; sin refrescar, seguía viendo cero aunque ya hubiera una.
  const router = useRouter();
  const t = useTranslations("proyectos.fotos");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden);
  const faltan = Math.max(0, MIN_FOTOS_EQUIPO - fotos.length);

  async function agregar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);

    if (fotos.length >= MAX) {
      setError(t("maximo", { max: MAX }));
      return;
    }
    if (!TIPOS.includes(archivo.type)) {
      setError(t("tipos"));
      return;
    }

    setSubiendo(true);

    let foto: File;
    try {
      foto = await comprimirImagen(archivo, { maxBytes: MAX_BYTES });
    } catch (err) {
      setSubiendo(false);
      setError(err instanceof ErrorImagen ? tEtiquetas(`imagen.${err.clave}`, err.valores) : t("procesar"));
      return;
    }

    const supabase = createClient();
    const extension = (foto.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const ruta = `${creadorId}/equipos/${equipoId}/${crypto.randomUUID()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("fotos-perfil")
      .upload(ruta, foto, { contentType: foto.type });

    if (errorSubida) {
      setSubiendo(false);
      setError(t("subir"));
      return;
    }

    const siguienteOrden = fotos.reduce((max, f) => Math.max(max, f.orden), -1) + 1;
    const { data, error: errorInsert } = await supabase
      .from("fotos_equipo")
      .insert({ equipo_id: equipoId, storage_path: ruta, orden: siguienteOrden })
      .select()
      .single();

    setSubiendo(false);

    if (errorInsert || !data) {
      await supabase.storage.from("fotos-perfil").remove([ruta]);
      setError(t("guardar"));
      return;
    }

    const url = supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl;
    setFotos((prev) => [...prev, { id: data.id, storage_path: ruta, orden: siguienteOrden, url }]);
    router.refresh();
  }

  async function eliminar(foto: FotoEquipo) {
    const supabase = createClient();
    await supabase.storage.from("fotos-perfil").remove([foto.storage_path]);
    await supabase.from("fotos_equipo").delete().eq("id", foto.id);
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-texto">{t("tituloEquipo")}</p>
      <div className="grid grid-cols-3 gap-2">
        {ordenadas.map((foto, i) => (
          <div
            key={foto.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-ink-100"
          >
            <Imagen
              src={foto.url}
              alt={t("altEquipo")}
              fill
              absoluto
              sizes="(max-width: 640px) 33vw, 200px"
            />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/75 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                {t("principal")}
              </span>
            )}
            <button
              type="button"
              onClick={() => eliminar(foto)}
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent px-1.5 pb-1.5 pt-4 text-right text-2xs font-medium text-white/90 hover:text-white"
            >
              {t("eliminar")}
            </button>
          </div>
        ))}

        {fotos.length < MAX && (
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-300 text-texto-tenue transition-colors hover:border-texto hover:text-texto">
            <Icono nombre="mas" className="h-5 w-5" />
            <span className="text-2xs font-medium">{subiendo ? t("subiendo") : t("agregar")}</span>
            <input
              type="file"
              accept={TIPOS.join(",")}
              className="hidden"
              onChange={agregar}
              disabled={subiendo}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-error-600">{error}</p>}
      <p className="text-xs text-texto-tenue">
        {faltan > 0
          ? t("pieEquipoFaltan", { n: fotos.length, max: MAX, faltan, minimo: MIN_FOTOS_EQUIPO })
          : t("pieEquipo", { n: fotos.length, max: MAX })}
      </p>
    </div>
  );
}
