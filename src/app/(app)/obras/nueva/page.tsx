"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { aColumnas, type Ubicacion } from "@/lib/ubicacion";

export default function NuevaObraPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [sinopsis, setSinopsis] = useState("");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [fechaEstreno, setFechaEstreno] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nuevos: Record<string, string> = {};
    if (!titulo.trim()) nuevos.titulo = "Ingresá el título de la obra.";
    if (!ubicacion) {
      nuevos.ubicacion = "Elegí la locación de ensayos de la lista de sugerencias.";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("obras")
      .insert({
        creador_id: user.id,
        titulo: titulo.trim(),
        sinopsis: sinopsis || null,
        ...aColumnas(ubicacion!),
        fecha_estreno_estimada: fechaEstreno || null,
      })
      .select()
      .single();

    setCargando(false);

    if (error || !data) {
      setErrorGeneral("No pudimos crear la obra. Intentá de nuevo.");
      return;
    }

    router.push(`/obras/${data.id}`);
  }

  return (
    <main className="px-5 py-5">
      <form onSubmit={crear} className="flex max-w-2xl flex-col gap-4">
        <CampoTexto id="titulo" etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} error={errores.titulo} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sinopsis" className="text-sm font-medium text-texto">
            Sinopsis (opcional)
          </label>
          <textarea
            id="sinopsis"
            rows={4}
            maxLength={2000}
            value={sinopsis}
            onChange={(e) => setSinopsis(e.target.value)}
            className="rounded-xl border border-borde px-3.5 py-2.5 text-base outline-none focus:border-ink-900"
          />
        </div>

        <CampoUbicacion
          id="ubicacion"
          etiqueta="Locación de ensayos"
          valor={ubicacion}
          onCambio={setUbicacion}
          error={errores.ubicacion}
        />
        <CampoTexto
          id="fecha_estreno"
          etiqueta="Fecha estimada de estreno (opcional)"
          type="date"
          value={fechaEstreno}
          onChange={(e) => setFechaEstreno(e.target.value)}
        />

        {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

        <Boton type="submit" cargando={cargando}>
          Crear y definir roles
        </Boton>
      </form>
    </main>
  );
}
