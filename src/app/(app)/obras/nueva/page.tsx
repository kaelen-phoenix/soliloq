"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export default function NuevaObraPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [sinopsis, setSinopsis] = useState("");
  const [locacion, setLocacion] = useState("");
  const [fechaEstreno, setFechaEstreno] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nuevos: Record<string, string> = {};
    if (!titulo.trim()) nuevos.titulo = "Ingresá el título de la obra.";
    if (!locacion.trim()) nuevos.locacion = "Ingresá la locación de ensayos.";
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
        locacion_ensayos: locacion.trim(),
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
      <form onSubmit={crear} className="flex flex-col gap-4">
        <CampoTexto id="titulo" etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} error={errores.titulo} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sinopsis" className="text-[13px] font-medium text-ink-700">
            Sinopsis (opcional)
          </label>
          <textarea
            id="sinopsis"
            rows={4}
            maxLength={2000}
            value={sinopsis}
            onChange={(e) => setSinopsis(e.target.value)}
            className="rounded-xl border border-ink-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-ink-900"
          />
        </div>

        <CampoTexto
          id="locacion"
          etiqueta="Locación de ensayos"
          value={locacion}
          onChange={(e) => setLocacion(e.target.value)}
          error={errores.locacion}
        />
        <CampoTexto
          id="fecha_estreno"
          etiqueta="Fecha estimada de estreno (opcional)"
          type="date"
          value={fechaEstreno}
          onChange={(e) => setFechaEstreno(e.target.value)}
        />

        {errorGeneral && <p className="text-sm text-red-600">{errorGeneral}</p>}

        <Boton type="submit" cargando={cargando}>
          Crear y definir roles
        </Boton>
      </form>
    </main>
  );
}
