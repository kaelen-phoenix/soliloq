"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export interface ObraPrevia {
  id: string;
  titulo: string;
  anio: number;
  rol_desempenado: string;
}

export function ObrasPrevias({ creadorId, obras }: { creadorId: string; obras: ObraPrevia[] }) {
  const [lista, setLista] = useState(
    [...obras].sort((a, b) => b.anio - a.anio)
  );
  const [titulo, setTitulo] = useState("");
  const [anio, setAnio] = useState("");
  const [rol, setRol] = useState("");
  const [error, setError] = useState<string | null>(null);

  const anioActual = new Date().getFullYear();

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const anioNum = Number(anio);
    if (!titulo.trim() || !rol.trim()) {
      setError("Completá título y rol.");
      return;
    }
    if (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > anioActual) {
      setError(`El año debe estar entre 1900 y ${anioActual}.`);
      return;
    }

    const supabase = createClient();
    const { data, error: errorInsert } = await supabase
      .from("obras_previas")
      .insert({ creador_id: creadorId, titulo: titulo.trim(), anio: anioNum, rol_desempenado: rol.trim() })
      .select()
      .single();

    if (errorInsert || !data) {
      setError("No pudimos guardar la obra previa.");
      return;
    }

    setLista((prev) => [...prev, data].sort((a, b) => b.anio - a.anio));
    setTitulo("");
    setAnio("");
    setRol("");
  }

  async function eliminar(id: string) {
    const supabase = createClient();
    await supabase.from("obras_previas").delete().eq("id", id);
    setLista((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {lista.map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded-xl border border-borde px-4 py-2">
            <div>
              <p className="font-medium text-texto">{o.titulo}</p>
              <p className="text-xs text-texto-tenue">
                {o.anio} · {o.rol_desempenado}
              </p>
            </div>
            <button type="button" onClick={() => eliminar(o.id)} className="text-xs text-error-600">
              Eliminar
            </button>
          </li>
        ))}
        {lista.length === 0 && <p className="text-sm text-texto-tenue">Todavía no cargaste obras previas.</p>}
      </ul>

      <form onSubmit={agregar} className="flex flex-col gap-3 rounded-xl border border-dashed border-borde p-4">
        <CampoTexto id="titulo_obra" etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto id="anio_obra" etiqueta="Año" type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
          <CampoTexto id="rol_obra" etiqueta="Tu rol" value={rol} onChange={(e) => setRol(e.target.value)} />
        </div>
        {error && <p className="text-xs text-error-600">{error}</p>}
        <Boton type="submit" variante="secundario">
          Agregar obra previa
        </Boton>
      </form>
    </div>
  );
}
