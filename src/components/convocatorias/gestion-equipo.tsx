"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { ConfirmarBorrado } from "@/components/ui/confirmar-borrado";
import {
  borrarCanalesDeIniciativa,
  canalesParaBorrar,
  sincronizarEspacioDeIniciativa,
} from "@/app/acciones-discord";
import { CampoTexto } from "@/components/ui/campo-texto";
import { Icono } from "@/components/ui/icono";
import { FotosEquipo, type FotoEquipo } from "@/components/convocatorias/fotos-equipo";
import { CoberturaIniciativa, type FilaCobertura } from "@/components/convocatorias/cobertura-iniciativa";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";
import { MejorarRedaccion } from "@/components/perfil/mejorar-redaccion";

export interface EquipoActivo {
  id: string;
  titulo: string;
  /** null = sin límite de integrantes (#330). */
  cupo: number | null;
  descripcion: string | null;
  activo: boolean;
}

const MAX_TITULO = 80;

function FormEquipo({
  titulo,
  setTitulo,
  descripcion,
  setDescripcion,
  error,
  cargando,
  onGuardar,
  onCancelar,
  editando,
}: {
  titulo: string;
  setTitulo: (v: string) => void;
  descripcion: string;
  setDescripcion: (v: string) => void;
  error: string | null;
  cargando: boolean;
  onGuardar: (e: React.FormEvent) => void;
  onCancelar: () => void;
  editando: boolean;
}) {
  // Puede haber varios equipos en pantalla (#330): los ids de los campos no se pueden repetir.
  const idBase = useId();
  return (
    <form onSubmit={onGuardar} className="mt-3 flex flex-col gap-4">
      <CampoTexto
        id={`${idBase}-titulo`}
        etiqueta="Título — por qué querés armar el equipo"
        placeholder="Escribamos juntos"
        maxLength={MAX_TITULO}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-descripcion`} className="text-sm font-medium text-texto">
          Descripción (opcional)
        </label>
        <textarea
          id={`${idBase}-descripcion`}
          rows={3}
          maxLength={2000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        />
        <MejorarRedaccion tipo="equipo" texto={descripcion} onUsar={setDescripcion} />
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
 * Gestión de un Equipo del Creador (issue #57): título y descripción, sin roles. Desde #330
 * no hay límites: se pueden tener varios Equipos y Proyectos a la vez, y el Equipo no tiene
 * cupo de integrantes. Con `equipo = null` es el formulario para armar uno nuevo.
 */
export function GestionEquipo({
  creadorId,
  equipo,
  fotos,
  cobertura,
  abiertoInicial = false,
  onCancelar,
}: {
  creadorId: string;
  equipo: EquipoActivo | null;
  fotos: FotoEquipo[];
  /** Quién ya forma parte del equipo, para "Participantes" (#152). */
  cobertura: FilaCobertura[];
  /** Desde «Crear proyecto» (#341) el formulario para armar uno nuevo llega ya abierto. */
  abiertoInicial?: boolean;
  /** Cancelar el alta vuelve a la pregunta «¿Qué querés armar?». */
  onCancelar?: () => void;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [titulo, setTitulo] = useState(equipo?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(equipo?.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

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
            .update({
              titulo: titulo.trim(),
              descripcion: descripcion || null,
              actualizado_en: new Date().toISOString(),
            })
            .eq("id", equipo.id)
        : await supabase
            .from("equipos")
            .insert({ creador_id: creadorId, titulo: titulo.trim(), descripcion: descripcion || null, cupo: null })
            .select("id")
            .single();

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
    // Recién armado: a su pantalla, como el Proyecto (#341).
    if (!editando && res.data && "id" in res.data) {
      router.push(`/equipos/${res.data.id}`);
      return;
    }
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
    // Cerrado: su espacio en Discord queda de solo lectura (#269).
    await sincronizarEspacioDeIniciativa({ equipoId: equipo.id }).catch(() => {});
    router.refresh();
  }

  // #215: eliminar el equipo de verdad (no "cerrarlo"). Por cascada se van los intereses,
  // matches y convocatorias —con eso sus Talentos vuelven a Buscar Talentos— y la sala con
  // sus mensajes (0083). Mismo recorrido que "Borrar proyecto" en `AccionesObra`.
  async function borrar() {
    if (!equipo) return;
    setError(null);
    setCargando(true);
    const supabase = createClient();
    // Las rutas se piden antes de borrar: `fotos_equipo` cae en cascada con el equipo y
    // después ya no habría de dónde sacarlas. Si esta consulta falla, no se borra nada.
    const { data: fotosActuales, error: errorFotos } = await supabase
      .from("fotos_equipo")
      .select("storage_path")
      .eq("equipo_id", equipo.id);
    if (errorFotos) {
      setCargando(false);
      setError("No se pudo eliminar el equipo. Probá de nuevo.");
      return;
    }
    // Primero la fila y después el Storage (no cascadea): si el borrado de la fila falla, el
    // equipo queda entero con sus fotos, en vez de vivo y sin fotos.
    // Los ids de sus canales de Discord, antes de que la sala caiga en cascada (#269).
    const canales = await canalesParaBorrar({ equipoId: equipo.id }).catch(() => null);
    const { error: errorBd } = await supabase.from("equipos").delete().eq("id", equipo.id);
    if (errorBd) {
      setCargando(false);
      setError("No se pudo eliminar el equipo. Probá de nuevo.");
      return;
    }
    // Recién con el equipo borrado se borran sus canales.
    await borrarCanalesDeIniciativa(canales).catch(() => {});
    const rutas = (fotosActuales ?? []).map((f) => f.storage_path);
    if (rutas.length > 0) {
      // Un archivo que no se borre queda huérfano en el Storage, pero el equipo ya no
      // existe: no se le muestra error a la persona, se reporta.
      const { error: errorStorage } = await supabase.storage.from("fotos-perfil").remove(rutas);
      if (errorStorage) {
        Sentry.captureException(errorStorage, { tags: { origen: "eliminar-equipo" } });
      }
    }
    setConfirmarBorrado(false);
    setCargando(false);
    // Su pantalla ya no existe: de vuelta a Mis proyectos.
    router.replace("/proyectos");
    router.refresh();
  }

  const form = (
    <FormEquipo
      titulo={titulo}
      setTitulo={setTitulo}
      descripcion={descripcion}
      setDescripcion={setDescripcion}
      error={error}
      cargando={cargando}
      onGuardar={guardar}
      onCancelar={() => (!equipo && onCancelar ? onCancelar() : setAbierto(false))}
      editando={editando}
    />
  );

  // Equipo activo: tarjeta con acciones.
  if (equipo) {
    return (
      <section className="rounded-2xl border border-borde bg-superficie p-4">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-coral px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-ink-950">
            Armar equipo
          </span>
          <p className="mt-2 text-base font-medium text-texto">{equipo.titulo}</p>
          {equipo.cupo != null && (
            <p className="mt-0.5 text-sm text-texto-tenue">
              Hasta {equipo.cupo} {equipo.cupo === 1 ? "integrante" : "integrantes"}
            </p>
          )}
          {equipo.descripcion && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-texto">{equipo.descripcion}</p>
          )}
        </div>

        {abierto ? (
          form
        ) : (
          <>
            <Link
              href={`/talentos?equipo=${equipo.id}`}
              className="brillo-accion mt-4 flex max-w-sm items-center justify-center gap-1.5 rounded-full bg-accion px-4 py-3 text-sm font-semibold text-accion-texto transition hover:brightness-110"
            >
              <Icono nombre="buscar" className="h-4 w-4" />
              Buscar talento para este equipo
            </Link>
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
            <FotosEquipo equipoId={equipo.id} creadorId={creadorId} fotosIniciales={fotos} />
            <p className="mt-4 rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
              Para sumar gente al equipo, buscá talento y deslizá. Cuando el interés es mutuo
              lo ves en <span className="font-medium text-texto">Convocatorias</span> y desde ahí lo
              convocás a la sala.
            </p>
            <div className="mt-4">
              <CoberturaIniciativa filas={cobertura} esEquipo />
            </div>
            <div className="mt-4 border-t border-borde pt-4">
              {error && !abierto && <p className="mb-2 text-xs text-error-600">{error}</p>}
              {!confirmarBorrado ? (
                <Boton
                  variante="fantasma"
                  className="!px-0 text-error-600 hover:!bg-transparent hover:underline"
                  onClick={() => {
                    setError(null);
                    setConfirmarBorrado(true);
                  }}
                >
                  Eliminar equipo
                </Boton>
              ) : (
                <ConfirmarBorrado
                  mensaje="Se elimina el equipo con sus fotos y su sala de chat. Los Talentos que convocaste vuelven a aparecer en Buscar Talentos. No se puede deshacer. Escribí BORRAR para confirmar."
                  textoBoton="Eliminar definitivamente"
                  cargando={cargando}
                  onConfirmar={borrar}
                  onCancelar={() => setConfirmarBorrado(false)}
                />
              )}
            </div>
          </>
        )}
      </section>
    );
  }

  // Sin nada: invitación a armar el equipo, con la explicación de para qué sirve (#170) —
  // desaparece apenas se confirma la selección y sólo queda el formulario.
  return abierto ? (
    <section className="rounded-2xl border border-borde bg-superficie p-4">{form}</section>
  ) : (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-texto-tenue">
        Armá equipo y empezá por conocer a quienes tienen ganas de crear como vos y la idea
        puede surgir en el camino.
      </p>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-borde px-4 py-3 text-sm font-medium text-texto-tenue transition-colors hover:border-texto hover:text-texto"
      >
        <Icono nombre="corazon" className="h-4 w-4" />
        Armar un equipo
      </button>
    </div>
  );
}
