"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvisoGuardado, useAvisoGuardado } from "@/components/ui/aviso-guardado";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { aColumnas, desdeColumnas, type Ubicacion } from "@/lib/ubicacion";
import { DISCIPLINAS, MAX_OTRO_DETALLE } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";

interface DatosIniciales {
  nombre: string;
  disciplinas: DisciplinaArtistica[];
  otro_detalle: string | null;
  ubicacion_texto: string;
  ubicacion_publica: string;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
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
  const [disciplinas, setDisciplinas] = useState<DisciplinaArtistica[]>(
    datosIniciales?.disciplinas ?? []
  );
  const [otroDetalle, setOtroDetalle] = useState(datosIniciales?.otro_detalle ?? "");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(
    desdeColumnas(datosIniciales) ?? null,
  );
  const [descripcion, setDescripcion] = useState(datosIniciales?.descripcion ?? "");
  const [imagenUrl, setImagenUrl] = useState(datosIniciales?.imagen_url ?? "");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useAvisoGuardado();

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
    if (disciplinas.length === 0) nuevos.disciplinas = "Elegí al menos una.";
    if (disciplinas.includes("otro") && otroDetalle.trim().length < 2) {
      nuevos.otroDetalle = "Contanos qué hacés.";
    }
    if (!ubicacion) nuevos.ubicacion = "Elegí una ubicación de la lista de sugerencias.";
    if (descripcion.length > 1000) nuevos.descripcion = "Máximo 1000 caracteres.";
    setErrores((prev) => ({ ...prev, ...nuevos }));
    return Object.keys(nuevos).length === 0;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setGuardado(false);
    if (!validar()) return;

    setCargando(true);
    const supabase = createClient();

    const campos = {
      nombre: nombre.trim(),
      disciplinas,
      // El detalle solo se guarda si "Otro" sigue elegido: si la persona lo desmarca, el
      // texto tiene que irse con él en vez de quedar colgado sin nada que lo explique.
      otro_detalle: disciplinas.includes("otro") ? otroDetalle.trim() : null,
      ...aColumnas(ubicacion!),
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
      router.refresh();
      // No se apaga `cargando`: la navegación desmonta el formulario.
      return;
    }

    // Editar no navega: este formulario ya vive en `/perfil`, así que el `router.replace`
    // que había acá era a la misma ruta y no desmontaba nada. `cargando` quedaba en `true`
    // para siempre y el botón se quedaba grisado.
    router.refresh();
    setCargando(false);
    setGuardado(true);
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <CampoTexto
          id="nombre"
          etiqueta="Tu nombre o el de tu compañía"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />

        {/* Perfil artístico. Es múltiple porque en el medio se hace más de una cosa: quien
            dirige también actúa, y obligar a elegir una sola falsea el perfil. */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-sm font-medium text-ink-700">
            Perfil artístico
            <span className="ml-1.5 font-normal text-ink-400">Elegí todo lo que hagas</span>
          </legend>

          <div className="flex flex-wrap gap-2">
            {DISCIPLINAS.map((d) => {
              const elegida = disciplinas.includes(d.valor);
              return (
                <button
                  key={d.valor}
                  type="button"
                  aria-pressed={elegida}
                  onClick={() =>
                    setDisciplinas((prev) =>
                      elegida ? prev.filter((v) => v !== d.valor) : [...prev, d.valor]
                    )
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    elegida
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 text-ink-600 hover:border-ink-300"
                  }`}
                >
                  {d.etiqueta}
                </button>
              );
            })}
          </div>

          {errores.disciplinas && (
            <p className="text-xs text-error-600">{errores.disciplinas}</p>
          )}

          {disciplinas.includes("otro") && (
            <CampoTexto
              id="otro-detalle"
              etiqueta="¿Qué hacés?"
              value={otroDetalle}
              maxLength={MAX_OTRO_DETALLE}
              placeholder="Por ejemplo: titiritera, técnica de vuelo"
              onChange={(e) => setOtroDetalle(e.target.value)}
              error={errores.otroDetalle}
            />
          )}
        </fieldset>

        <CampoUbicacion
          id="ubicacion"
          etiqueta="Ubicación"
          valor={ubicacion}
          onCambio={setUbicacion}
          error={errores.ubicacion}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Descripción e imagen (opcional)</h2>
        <textarea
          rows={4}
          maxLength={1000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-base outline-none focus:border-ink-900"
          placeholder="Contanos sobre tu trayectoria o la de tu compañía."
        />
        <div className="flex items-center gap-3">
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt="Imagen de perfil" className="h-16 w-16 rounded-full object-cover" />
          )}
          <label className="cursor-pointer rounded-xl border border-ink-200 px-3.5 py-2 text-sm hover:bg-ink-50">
            {subiendoImagen ? "Subiendo…" : "Elegir imagen"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirImagen} />
          </label>
        </div>
        {errores.imagen && <p className="text-xs text-error-600">{errores.imagen}</p>}
      </section>

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

      <AvisoGuardado visible={guardado} />

      <Boton type="submit" cargando={cargando}>
        {esAlta ? "Completar perfil" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
