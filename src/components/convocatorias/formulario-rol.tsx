"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { GENEROS_BUSCABLES, type Genero } from "@/lib/constantes";
import type { TipoRol } from "@/lib/supabase/types";

export function FormularioRol({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoRol>("actuacion");
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");
  const [vacantes, setVacantes] = useState("1");
  const [descripcion, setDescripcion] = useState("");
  // Vacío significa abierto a cualquier género, y es el default: un rol al que no se le tocó
  // nada le llega a todo el mundo.
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Ingresá el nombre del rol.");
      return;
    }
    const min = edadMinima ? Number(edadMinima) : null;
    const max = edadMaxima ? Number(edadMaxima) : null;
    if (min !== null && max !== null && min > max) {
      setError("La edad mínima no puede ser mayor que la máxima.");
      return;
    }
    const vacantesNum = Number(vacantes);
    if (!Number.isInteger(vacantesNum) || vacantesNum < 1) {
      setError("Debe haber al menos una vacante.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorInsert } = await supabase.from("roles").insert({
      obra_id: obraId,
      nombre: nombre.trim(),
      tipo,
      edad_minima: min,
      edad_maxima: max,
      vacantes: vacantesNum,
      descripcion: descripcion || null,
      generos_buscados: generos,
    });

    setCargando(false);

    if (errorInsert) {
      setError("No pudimos guardar el rol. Intentá de nuevo.");
      return;
    }

    setNombre("");
    setEdadMinima("");
    setEdadMaxima("");
    setVacantes("1");
    setDescripcion("");
    setGeneros([]);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <Boton variante="secundario" onClick={() => setAbierto(true)} type="button">
        + Agregar rol
      </Boton>
    );
  }

  return (
    <form onSubmit={agregar} className="flex max-w-2xl flex-col gap-3 rounded-xl border border-dashed border-borde p-4">
      <CampoTexto id="rol_nombre" etiqueta="Nombre del rol" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setTipo("actuacion")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm ${tipo === "actuacion" ? "border-accion bg-accion text-accion-texto" : "border-borde"}`}
        >
          Actuación
        </button>
        <button
          type="button"
          onClick={() => setTipo("tecnica")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm ${tipo === "tecnica" ? "border-accion bg-accion text-accion-texto" : "border-borde"}`}
        >
          Técnica
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <CampoTexto id="edad_min" etiqueta="Edad mín." type="number" value={edadMinima} onChange={(e) => setEdadMinima(e.target.value)} />
        <CampoTexto id="edad_max" etiqueta="Edad máx." type="number" value={edadMaxima} onChange={(e) => setEdadMaxima(e.target.value)} />
        <CampoTexto id="vacantes" etiqueta="Vacantes" type="number" min={1} value={vacantes} onChange={(e) => setVacantes(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-texto">Géneros buscados (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {GENEROS_BUSCABLES.map((g) => (
            <button
              key={g.valor}
              type="button"
              onClick={() =>
                setGeneros((prev) =>
                  prev.includes(g.valor)
                    ? prev.filter((x) => x !== g.valor)
                    : [...prev, g.valor],
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                generos.includes(g.valor)
                  ? "border-accion bg-accion text-accion-texto"
                  : "border-borde text-texto-tenue"
              }`}
            >
              {g.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-xs text-texto-tenue">
          {generos.length === 0
            ? "Sin marcar nada, el rol le llega a cualquier persona."
            : "Solo le llega a quien coincida, y a quien prefirió no declarar su género."}
        </p>
      </div>

      <textarea
        rows={3}
        placeholder="Descripción del rol"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="rounded-xl border border-borde px-3.5 py-2.5 text-base outline-none focus:border-ink-900"
      />

      {error && <p className="text-xs text-error-600">{error}</p>}

      <div className="flex gap-2">
        <Boton type="submit" cargando={cargando}>
          Guardar rol
        </Boton>
        <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
