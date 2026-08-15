"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvisoGuardado, useAvisoGuardado } from "@/components/ui/aviso-guardado";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import {
  GENEROS,
  HABILIDADES,
  MAX_GENERO_DESCRIPCION,
  type Genero,
} from "@/lib/constantes";
import { aColumnas, desdeColumnas, unidadPorPais, type Ubicacion } from "@/lib/ubicacion";
import { esVideoreelValido } from "@/lib/videoreel";
import { MIN_FOTOS, persistirFotosPendientes, SubirFotos, type FotoTalento } from "./subir-fotos";

interface DatosIniciales {
  nombre: string;
  fecha_nacimiento: string;
  ubicacion_texto: string;
  ubicacion_publica: string;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  habilidades: string[];
}

export function FormularioTalento({
  userId,
  esAlta,
  datosIniciales,
  fotosIniciales,
}: {
  userId: string;
  esAlta: boolean;
  datosIniciales?: DatosIniciales;
  fotosIniciales: FotoTalento[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(datosIniciales?.nombre ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(datosIniciales?.fecha_nacimiento ?? "");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(
    desdeColumnas(datosIniciales) ?? null,
  );
  const [genero, setGenero] = useState<Genero | "">(datosIniciales?.genero ?? "");
  const [generoDescripcion, setGeneroDescripcion] = useState(
    datosIniciales?.genero_descripcion ?? "",
  );
  const [videoreelUrl, setVideoreelUrl] = useState(datosIniciales?.videoreel_url ?? "");
  const [experiencia, setExperiencia] = useState(datosIniciales?.experiencia ?? "");
  const [habilidades, setHabilidades] = useState<string[]>(datosIniciales?.habilidades ?? []);
  const [fotos, setFotos] = useState<FotoTalento[]>(fotosIniciales);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useAvisoGuardado();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function alternarHabilidad(h: string) {
    setHabilidades((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};

    if (nombre.trim().length < 2) nuevos.nombre = "Ingresá tu nombre.";
    if (!fechaNacimiento) {
      nuevos.fecha_nacimiento = "Ingresá tu fecha de nacimiento.";
    } else {
      const hace16 = new Date();
      hace16.setFullYear(hace16.getFullYear() - 16);
      if (new Date(fechaNacimiento) > hace16) {
        nuevos.fecha_nacimiento = "La plataforma es para mayores de 16 años.";
      }
    }
    if (!ubicacion) nuevos.ubicacion = "Elegí tu ubicación de la lista de sugerencias.";
    if (!genero) nuevos.genero = "Elegí una opción.";
    if (generoDescripcion.length > MAX_GENERO_DESCRIPCION) {
      nuevos.genero_descripcion = `Máximo ${MAX_GENERO_DESCRIPCION} caracteres.`;
    }
    if (fotos.length < MIN_FOTOS) nuevos.fotos = `Cargá al menos ${MIN_FOTOS} fotos.`;
    if (videoreelUrl && !esVideoreelValido(videoreelUrl)) {
      nuevos.videoreel_url =
        "No reconocemos ese enlace. Pegá el link de un video de YouTube o Vimeo.";
    }
    if (experiencia.length > 2000) nuevos.experiencia = "Máximo 2000 caracteres.";

    setErrores(nuevos);
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
      fecha_nacimiento: fechaNacimiento,
      ...aColumnas(ubicacion!),
      genero: genero as Genero,
      genero_descripcion: generoDescripcion.trim() || null,
      videoreel_url: videoreelUrl || null,
      experiencia: experiencia || null,
      habilidades,
    };

    // La unidad se deriva del país **solo al crear el perfil**. Al editar no se toca: quien
    // se mudó de Chicago a Berlín puede seguir pensando en millas.
    const { error } = esAlta
      ? await supabase.from("perfiles_talento").insert({
          id: userId,
          ...campos,
          unidad_distancia: unidadPorPais(ubicacion!.pais),
        })
      : await supabase.from("perfiles_talento").update(campos).eq("id", userId);

    if (error) {
      setCargando(false);
      setErrorGeneral("No pudimos guardar tu perfil. Revisá los datos e intentá de nuevo.");
      return;
    }

    if (esAlta) {
      // Recién ahora existe la fila de `perfiles_talento` que exige la FK de las fotos.
      await persistirFotosPendientes(userId, fotos);
      // El perfil recién creado pasa a ser el modo en el que se opera.
      await supabase
        .from("perfiles")
        .update({ onboarding_completo: true, modo_activo: "talento" })
        .eq("id", userId);
      router.replace("/");
      router.refresh();
      // No se apaga `cargando`: la navegación desmonta el formulario, y apagarlo acá haría
      // parpadear el botón a "Guardar" durante el viaje.
      return;
    }

    // Editar no navega: este formulario ya vive en `/perfil`, así que el `router.replace`
    // que había acá era a la misma ruta y no desmontaba nada. `cargando` quedaba en `true`
    // para siempre y el botón se quedaba grisado — no se podía volver a editar sin recargar.
    router.refresh();
    setCargando(false);
    setGuardado(true);
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Ficha básica</h2>
        <CampoTexto
          id="nombre"
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />
        <CampoTexto
          id="fecha_nacimiento"
          etiqueta="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          error={errores.fecha_nacimiento}
        />
        <CampoUbicacion
          id="ubicacion"
          etiqueta="Ubicación"
          valor={ubicacion}
          onCambio={setUbicacion}
          error={errores.ubicacion}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="genero" className="text-sm font-medium text-ink-700">
            Género
          </label>
          <select
            id="genero"
            value={genero}
            onChange={(e) => setGenero(e.target.value as Genero | "")}
            className={`rounded-xl border bg-white px-3.5 py-2.5 text-base focus:border-ink-900 ${
              errores.genero ? "border-error-400" : "border-ink-200"
            }`}
          >
            <option value="">Elegí una opción</option>
            {GENEROS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.etiqueta}
              </option>
            ))}
          </select>
          {errores.genero && <p className="text-xs text-error-600">{errores.genero}</p>}
        </div>

        <CampoTexto
          id="genero_descripcion"
          etiqueta="Cómo te identificás (opcional)"
          placeholder="Con tus palabras"
          maxLength={MAX_GENERO_DESCRIPCION}
          value={generoDescripcion}
          onChange={(e) => setGeneroDescripcion(e.target.value)}
          error={errores.genero_descripcion}
        />
        <p className="-mt-2 text-xs text-ink-500">
          Se muestra en tu perfil. No se usa para filtrar convocatorias.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Portfolio de fotos</h2>
        <SubirFotos talentoId={userId} fotos={fotos} onCambio={setFotos} persistir={!esAlta} />
        {errores.fotos && <p className="text-xs text-error-600">{errores.fotos}</p>}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">Videoreel (opcional)</h2>
        <CampoTexto
          id="videoreel"
          etiqueta="Enlace de YouTube o Vimeo"
          placeholder="https://youtu.be/... o https://vimeo.com/..."
          value={videoreelUrl}
          onChange={(e) => setVideoreelUrl(e.target.value)}
          error={errores.videoreel_url}
        />
        <p className="-mt-2 text-xs text-ink-500">
          Sirve el link normal, el de compartir, Shorts o el de la app del celular.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">CV y habilidades</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="experiencia" className="text-sm font-medium text-ink-700">
            Experiencia
          </label>
          <textarea
            id="experiencia"
            rows={5}
            maxLength={2000}
            value={experiencia}
            onChange={(e) => setExperiencia(e.target.value)}
            className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-base outline-none focus:border-ink-900"
            placeholder="Contá tu formación, obras en las que participaste, etc."
          />
          <p className="text-right text-xs text-ink-300">{experiencia.length}/2000</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {HABILIDADES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => alternarHabilidad(h)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                habilidades.includes(h)
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-100 text-ink-500"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </section>

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}
      <AvisoGuardado visible={guardado} />

      <Boton type="submit" cargando={cargando}>
        {esAlta ? "Completar perfil" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
