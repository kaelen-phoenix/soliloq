"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { aColumnas, desdeColumnas, type Ubicacion } from "@/lib/ubicacion";
import { MejorarRedaccion } from "@/components/perfil/mejorar-redaccion";

interface ObraEditable {
  id: string;
  titulo: string;
  sinopsis: string | null;
  fecha_estreno_estimada: string | null;
  ubicacion_texto: string;
  ubicacion_publica: string | null;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
}

/**
 * Editar los datos de una obra ya creada (issue #123). Guardar → vuelve a la vista del
 * proyecto. Solo el dueño llega acá (`/obras/[id]?editar=1`, gateado en la page).
 */
export function EditarObra({ obra }: { obra: ObraEditable }) {
  const router = useRouter();
  const t = useTranslations("proyectos.formularioObra");
  const tc = useTranslations("comun");
  const [titulo, setTitulo] = useState(obra.titulo);
  const [sinopsis, setSinopsis] = useState(obra.sinopsis ?? "");
  const [fechaEstreno, setFechaEstreno] = useState(obra.fecha_estreno_estimada ?? "");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(desdeColumnas(obra) ?? null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const nuevos: Record<string, string> = {};
    if (!titulo.trim()) nuevos.titulo = t("errorTituloObra");
    if (!ubicacion) nuevos.ubicacion = t("errorUbicacionCorta");
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("obras")
      .update({
        titulo: titulo.trim(),
        sinopsis: sinopsis.trim() || null,
        fecha_estreno_estimada: fechaEstreno || null,
        ...aColumnas(ubicacion!),
      })
      .eq("id", obra.id);
    setCargando(false);

    if (error) {
      setErrorGeneral(t("errorGuardar"));
      return;
    }
    router.push(`/obras/${obra.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="flex max-w-2xl flex-col gap-4">
      <CampoTexto
        id="titulo"
        etiqueta={t("titulo")}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        error={errores.titulo}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sinopsis" className="text-sm font-medium text-texto">
          {t("sinopsis")}
        </label>
        <textarea
          id="sinopsis"
          rows={4}
          maxLength={2000}
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        />
        <MejorarRedaccion tipo="sinopsis" texto={sinopsis} onUsar={setSinopsis} />
      </div>
      <CampoUbicacion
        id="ubicacion"
        etiqueta={t("ubicacion")}
        valor={ubicacion}
        onCambio={setUbicacion}
        error={errores.ubicacion}
      />
      <CampoTexto
        id="fecha_estreno"
        etiqueta={t("fechaEstreno")}
        type="date"
        value={fechaEstreno}
        onChange={(e) => setFechaEstreno(e.target.value)}
      />

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

      <div className="flex gap-2">
        <Boton type="submit" cargando={cargando}>
          {t("guardarCambios")}
        </Boton>
        <button
          type="button"
          onClick={() => router.push(`/obras/${obra.id}`)}
          className="rounded-xl px-4 text-sm font-medium text-texto-tenue transition-colors hover:text-texto"
        >
          {tc("cancelar")}
        </button>
      </div>
    </form>
  );
}
