"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";

export interface EquipoActivo {
  id: string;
  titulo: string;
  cupo: number;
  activo: boolean;
}

const CUPO_MIN = 1;
const CUPO_MAX = 6;
const MAX_TITULO = 80;

function FormEquipo({
  titulo,
  setTitulo,
  cupo,
  setCupo,
  error,
  cargando,
  onGuardar,
  onCancelar,
  editando,
}: {
  titulo: string;
  setTitulo: (v: string) => void;
  cupo: number;
  setCupo: (v: number) => void;
  error: string | null;
  cargando: boolean;
  onGuardar: (e: React.FormEvent) => void;
  onCancelar: () => void;
  editando: boolean;
}) {
  return (
    <form onSubmit={onGuardar} className="mt-3 flex flex-col gap-4">
      <CampoTexto
        id="equipo-titulo"
        etiqueta="Título — por qué querés armar el equipo"
        placeholder="Escribamos juntos"
        maxLength={MAX_TITULO}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-texto">Cuántas personas querés sumar</span>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: CUPO_MAX - CUPO_MIN + 1 }, (_, i) => CUPO_MIN + i).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={cupo === n}
              onClick={() => setCupo(n)}
              className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
                cupo === n
                  ? "border-accion bg-accion text-accion-texto"
                  : "border-borde text-texto-tenue hover:border-ink-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-error-600">{error}</p>}

      <div className="flex gap-2">
        <Boton type="submit" cargando={cargando}>
          {editando ? "Guardar" : "Armar equipo"}
        </Boton>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 text-sm font-medium text-texto-tenue transition-colors hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Gestión del "Armar equipo" del Creador (issue #57, fase 1): título + cupo, sin roles.
 * Un Creador lleva adelante una sola iniciativa a la vez — si ya tiene una obra publicada,
 * acá se le explica que primero la cierre (la exclusión mutua se garantiza con un trigger
 * de base en la fase 2).
 *
 * Las fotos del equipo (mínimo 3) llegan en una unidad aparte; por ahora el equipo se crea
 * con título y cupo.
 */
export function GestionEquipo({
  creadorId,
  equipo,
  tieneObraPublicada,
}: {
  creadorId: string;
  equipo: EquipoActivo | null;
  tieneObraPublicada: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState(equipo?.titulo ?? "");
  const [cupo, setCupo] = useState(equipo?.cupo ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const editando = equipo !== null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (titulo.trim().length < 1) {
      setError("Ponele un título al equipo.");
      return;
    }

    setCargando(true);
    const supabase = createClient();

    const res =
      editando && equipo
        ? await supabase
            .from("equipos")
            .update({ titulo: titulo.trim(), cupo, actualizado_en: new Date().toISOString() })
            .eq("id", equipo.id)
        : await supabase
            .from("equipos")
            .insert({ creador_id: creadorId, titulo: titulo.trim(), cupo });

    setCargando(false);
    if (res.error) {
      setError(
        editando
          ? "No pudimos guardar los cambios. Probá de nuevo."
          : "No pudimos crear el equipo. Probá de nuevo."
      );
      return;
    }

    setAbierto(false);
    router.refresh();
  }

  async function desactivar() {
    if (!equipo) return;
    setCargando(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("equipos")
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq("id", equipo.id);
    setCargando(false);
    if (err) {
      setError("No pudimos cerrar el equipo. Probá de nuevo.");
      return;
    }
    router.refresh();
  }

  const form = (
    <FormEquipo
      titulo={titulo}
      setTitulo={setTitulo}
      cupo={cupo}
      setCupo={setCupo}
      error={error}
      cargando={cargando}
      onGuardar={guardar}
      onCancelar={() => setAbierto(false)}
      editando={editando}
    />
  );

  // Equipo activo: tarjeta con acciones.
  if (equipo) {
    return (
      <section className="rounded-2xl border border-borde bg-superficie p-4">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-brand-500 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-white">
            Armar equipo
          </span>
          <p className="mt-2 text-base font-medium text-texto">{equipo.titulo}</p>
          <p className="mt-0.5 text-sm text-texto-tenue">
            Hasta {equipo.cupo} {equipo.cupo === 1 ? "integrante" : "integrantes"}
          </p>
        </div>

        {abierto ? (
          form
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil"
            >
              <Icono nombre="cambiar" className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={desactivar}
              disabled={cargando}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-texto-tenue transition-colors hover:text-error-600 disabled:opacity-50"
            >
              Cerrar el equipo
            </button>
          </div>
        )}
      </section>
    );
  }

  // Sin equipo, pero con una obra publicada: se explica la exclusión.
  if (tieneObraPublicada) {
    return (
      <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
        Para armar un equipo, primero cerrá tus obras publicadas: un perfil de Creador lleva
        adelante una sola iniciativa a la vez.
      </p>
    );
  }

  // Sin nada: invitación a armar el equipo.
  return abierto ? (
    <section className="rounded-2xl border border-borde bg-superficie p-4">{form}</section>
  ) : (
    <button
      type="button"
      onClick={() => setAbierto(true)}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-borde px-4 py-3 text-sm font-medium text-texto-tenue transition-colors hover:border-texto hover:text-texto"
    >
      <Icono nombre="corazon" className="h-4 w-4" />
      Armar un equipo
    </button>
  );
}
