"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { LOCACIONES } from "@/lib/constantes";
import type { TipoCreador } from "@/lib/supabase/types";

interface DatosIniciales {
  nombre: string;
  tipo: TipoCreador;
  locacion: string;
  descripcion: string | null;
  imagen_url: string | null;
}

export function FormularioCreador({
  userId,
  esAlta,
  datosIniciales,
}: {
  userId: string;
  esAlta: boolean;
  datosIniciales?: DatosIniciales;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(datosIniciales?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoCreador>(datosIniciales?.tipo ?? "director_independiente");
  const [locacion, setLocacion] = useState(datosIniciales?.locacion ?? "");
  const [descripcion, setDescripcion] = useState(datosIniciales?.descripcion ?? "");
  const [imagenUrl, setImagenUrl] = useState(datosIniciales?.imagen_url ?? "");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setErrores((p) => ({ ...p, imagen: "Solo se admiten imágenes JPEG, PNG o WebP." }));
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setErrores((p) => ({ ...p, imagen: "La imagen no puede superar los 5 MB." }));
      return;
    }

    setSubiendoImagen(true);
    const supabase = createClient();
    const extension = archivo.name.split(".").pop();
    const ruta = `${userId}/perfil.${extension}`;
    await supabase.storage.from("fotos-perfil").upload(ruta, archivo, { upsert: true });
    const { data: publica } = supabase.storage.from("fotos-perfil").getPublicUrl(ruta);
    setImagenUrl(publica.publicUrl);
    setSubiendoImagen(false);
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (nombre.trim().length < 2) nuevos.nombre = "Ingresá el nombre.";
    if (!locacion) nuevos.locacion = "Elegí una locación.";
    if (descripcion.length > 1000) nuevos.descripcion = "Máximo 1000 caracteres.";
    setErrores((prev) => ({ ...prev, ...nuevos }));
    return Object.keys(nuevos).length === 0;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    if (!validar()) return;

    setCargando(true);
    const supabase = createClient();

    const campos = {
      nombre: nombre.trim(),
      tipo,
      locacion,
      descripcion: descripcion || null,
      imagen_url: imagenUrl || null,
    };

    const { error } = esAlta
      ? await supabase.from("perfiles_creador").insert({ id: userId, ...campos })
      : await supabase.from("perfiles_creador").update(campos).eq("id", userId);

    if (error) {
      setCargando(false);
      setErrorGeneral("No pudimos guardar tu perfil. Intentá de nuevo.");
      return;
    }

    if (esAlta) {
      // El perfil recién creado pasa a ser el modo en el que se opera.
      await supabase
        .from("perfiles")
        .update({ onboarding_completo: true, modo_activo: "creador" })
        .eq("id", userId);
      router.replace("/");
    } else {
      router.replace("/perfil");
    }
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTipo("director_independiente")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium ${
              tipo === "director_independiente" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-100"
            }`}
          >
            Director/a independiente
          </button>
          <button
            type="button"
            onClick={() => setTipo("compania")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium ${
              tipo === "compania" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-100"
            }`}
          >
            Compañía
          </button>
        </div>

        <CampoTexto
          id="nombre"
          etiqueta={tipo === "compania" ? "Nombre de la compañía" : "Tu nombre"}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="locacion" className="text-[13px] font-medium text-ink-700">
            Locación
          </label>
          <select
            id="locacion"
            value={locacion}
            onChange={(e) => setLocacion(e.target.value)}
            className={`rounded-xl border bg-white px-3.5 py-2.5 text-[15px] focus:border-ink-900 ${
              errores.locacion ? "border-red-400" : "border-ink-200"
            }`}
          >
            <option value="">Elegí una locación</option>
            {LOCACIONES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {errores.locacion && <p className="text-xs text-red-600">{errores.locacion}</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Descripción e imagen (opcional)</h2>
        <textarea
          rows={4}
          maxLength={1000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-ink-900"
          placeholder="Contanos sobre tu trayectoria o la de tu compañía."
        />
        <div className="flex items-center gap-3">
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt="Imagen de perfil" className="h-16 w-16 rounded-full object-cover" />
          )}
          <label className="cursor-pointer rounded-xl border border-ink-200 px-3.5 py-2 text-[13px] hover:bg-ink-50">
            {subiendoImagen ? "Subiendo…" : "Elegir imagen"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirImagen} />
          </label>
        </div>
        {errores.imagen && <p className="text-xs text-red-600">{errores.imagen}</p>}
      </section>

      {errorGeneral && <p className="text-sm text-red-600">{errorGeneral}</p>}

      <Boton type="submit" cargando={cargando}>
        {esAlta ? "Completar perfil" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
