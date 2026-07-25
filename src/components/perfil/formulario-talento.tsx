"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { HABILIDADES, LOCACIONES, PLATAFORMAS_VIDEOREEL_REGEX } from "@/lib/constantes";
import { MIN_FOTOS, persistirFotosPendientes, SubirFotos, type FotoTalento } from "./subir-fotos";

interface DatosIniciales {
  nombre: string;
  fecha_nacimiento: string;
  locacion: string;
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
  const [locacion, setLocacion] = useState(datosIniciales?.locacion ?? "");
  const [videoreelUrl, setVideoreelUrl] = useState(datosIniciales?.videoreel_url ?? "");
  const [experiencia, setExperiencia] = useState(datosIniciales?.experiencia ?? "");
  const [habilidades, setHabilidades] = useState<string[]>(datosIniciales?.habilidades ?? []);
  const [fotos, setFotos] = useState<FotoTalento[]>(fotosIniciales);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
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
    if (!locacion) nuevos.locacion = "Elegí tu locación.";
    if (fotos.length < MIN_FOTOS) nuevos.fotos = `Cargá al menos ${MIN_FOTOS} fotos.`;
    if (videoreelUrl && !PLATAFORMAS_VIDEOREEL_REGEX.test(videoreelUrl)) {
      nuevos.videoreel_url = "Solo se admiten enlaces de YouTube o Vimeo.";
    }
    if (experiencia.length > 2000) nuevos.experiencia = "Máximo 2000 caracteres.";

    setErrores(nuevos);
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
      fecha_nacimiento: fechaNacimiento,
      locacion,
      videoreel_url: videoreelUrl || null,
      experiencia: experiencia || null,
      habilidades,
    };

    const { error } = esAlta
      ? await supabase.from("perfiles_talento").insert({ id: userId, ...campos })
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
    } else {
      router.replace("/perfil");
    }
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Ficha básica</h2>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="locacion" className="text-sm font-medium text-ink-700">
            Locación
          </label>
          <select
            id="locacion"
            value={locacion}
            onChange={(e) => setLocacion(e.target.value)}
            className={`rounded-xl border px-4 py-3 text-base outline-none focus:border-brand-500 ${
              errores.locacion ? "border-red-400" : "border-ink-100"
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Portfolio de fotos</h2>
        <SubirFotos talentoId={userId} fotos={fotos} onCambio={setFotos} persistir={!esAlta} />
        {errores.fotos && <p className="text-xs text-red-600">{errores.fotos}</p>}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Videoreel (opcional)</h2>
        <CampoTexto
          id="videoreel"
          etiqueta="Enlace de YouTube o Vimeo"
          placeholder="https://youtu.be/..."
          value={videoreelUrl}
          onChange={(e) => setVideoreelUrl(e.target.value)}
          error={errores.videoreel_url}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">CV y habilidades</h2>
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
            className="rounded-xl border border-ink-100 px-4 py-3 text-base outline-none focus:border-brand-500"
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
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-ink-100 text-ink-500"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </section>

      {errorGeneral && <p className="text-sm text-red-600">{errorGeneral}</p>}

      <Boton type="submit" cargando={cargando}>
        {esAlta ? "Completar perfil" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
