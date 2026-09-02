"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BotonDenuncia } from "@/components/ui/boton-denuncia";
import { Imagen } from "@/components/ui/imagen";

export interface Mensaje {
  id: string;
  autor_id: string;
  contenido: string;
  creado_en: string;
  noEnviado?: boolean;
}

export interface Integrante {
  perfil_id: string;
  nombre: string;
  foto_url: string | null;
  rol_en_obra: string;
}

export function SalaChat({
  salaId,
  userId,
  mensajesIniciales,
  integrantes,
}: {
  salaId: string;
  userId: string;
  mensajesIniciales: Mensaje[];
  integrantes: Integrante[];
}) {
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const [mostrarIntegrantes, setMostrarIntegrantes] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const ultimoIdRef = useRef<string | null>(mensajesIniciales.at(-1)?.id ?? null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  // Quiénes se pueden leer en esta sala. `integrantes` ya viene filtrado por RLS, así que
  // alguien bloqueado no está en el conjunto. Es el respaldo del filtro real, que vive en
  // las políticas: si un día Realtime entregara un INSERT sin evaluar RLS, el mensaje de la
  // persona bloqueada no se pinta igual. Un autor que no sea integrante no existe — sólo los
  // integrantes pueden insertar (`mensajes_insert_integrante`).
  const visibles = useMemo(() => new Set(integrantes.map((i) => i.perfil_id)), [integrantes]);
  const visiblesRef = useRef(visibles);
  visiblesRef.current = visibles;

  useEffect(() => {
    const supabase = createClient();

    async function recuperarPerdidos() {
      const desde = ultimoIdRef.current
        ? mensajes.find((m) => m.id === ultimoIdRef.current)?.creado_en
        : undefined;
      const query = supabase.from("mensajes").select("*").eq("sala_id", salaId).order("creado_en");
      const { data } = desde ? await query.gt("creado_en", desde) : await query;
      if (data && data.length > 0) {
        setMensajes((prev) => {
          const idsExistentes = new Set(prev.map((m) => m.id));
          const nuevos = data.filter((m) => !idsExistentes.has(m.id));
          return [...prev, ...nuevos];
        });
      }
    }

    const canal = supabase
      .channel(`sala-${salaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes", filter: `sala_id=eq.${salaId}` },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          if (!visiblesRef.current.has(nuevo.autor_id)) return;
          setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]));
          ultimoIdRef.current = nuevo.id;
        }
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") recuperarPerdidos();
      });

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || contenido.length > 2000) return;

    const idTemporal = crypto.randomUUID();
    const optimista: Mensaje = {
      id: idTemporal,
      autor_id: userId,
      contenido,
      creado_en: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, optimista]);
    setTexto("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("mensajes")
      .insert({ sala_id: salaId, autor_id: userId, contenido })
      .select()
      .single();

    if (error || !data) {
      setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? { ...m, noEnviado: true } : m)));
      return;
    }

    setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? data : m)));
    ultimoIdRef.current = data.id;
  }

  async function reintentar(mensaje: Mensaje) {
    setMensajes((prev) => prev.filter((m) => m.id !== mensaje.id));
    const supabase = createClient();
    const idTemporal = crypto.randomUUID();
    setMensajes((prev) => [...prev, { ...mensaje, id: idTemporal }]);

    const { data, error } = await supabase
      .from("mensajes")
      .insert({ sala_id: salaId, autor_id: userId, contenido: mensaje.contenido })
      .select()
      .single();

    if (error || !data) {
      setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? { ...m, noEnviado: true } : m)));
      return;
    }
    setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? data : m)));
  }

  function integrantePor(id: string) {
    return integrantes.find((i) => i.perfil_id === id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => setMostrarIntegrantes((v) => !v)}
        className="border-b border-borde px-4 py-2 text-left text-2xs font-medium uppercase tracking-wide text-texto-tenue hover:text-texto"
      >
        {integrantes.length} integrantes
      </button>

      {mostrarIntegrantes && (
        <ul className="flex flex-col gap-2 border-b border-borde p-4">
          {integrantes.map((i) => (
            <li key={i.perfil_id} className="flex items-center gap-2">
              {i.foto_url ? (
                <Imagen
                  src={i.foto_url}
                  alt={i.nombre}
                  width={32}
                  height={32}
                  contenedorClassName="shrink-0 rounded-full"
                  fallback={<div className="h-8 w-8 rounded-full bg-ink-100" />}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-ink-100" />
              )}
              <div>
                <p className="text-sm font-medium text-texto">{i.nombre}</p>
                <p className="text-xs text-texto-tenue">{i.rol_en_obra}</p>
              </div>
            </li>
          ))}

          {/* La denuncia vive acá, dentro de la lista de integrantes, y no en la cabecera:
              es donde alguien va a mirar cuando quiere reportar a una persona de la sala. */}
          <li className="pt-1">
            <BotonDenuncia salaId={salaId} queSeDenuncia="lo que pasa en esta sala" />
          </li>
        </ul>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [&>*]:mx-auto [&>*]:max-w-3xl">
        {mensajes.length === 0 && (
          <p className="mx-auto mt-10 max-w-[16rem] text-center text-sm leading-relaxed text-texto-tenue">
            Esta sala se abrió porque hay equipo. Coordinen fechas de audición y compartan textos acá.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {mensajes.map((m) => {
            const autor = integrantePor(m.autor_id);
            const esPropio = m.autor_id === userId;
            return (
              <li key={m.id} className={`flex ${esPropio ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                    esPropio ? "bg-accion text-accion-texto" : "bg-ink-100 text-texto"
                  }`}
                >
                  {!esPropio && (
                    <p className="text-2xs font-medium opacity-60">{autor?.nombre ?? "Integrante"}</p>
                  )}
                  <p className="text-base leading-snug">{m.contenido}</p>
                  <p className="mt-0.5 text-2xs opacity-50">
                    {new Date(m.creado_en).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {m.noEnviado && (
                    <button type="button" onClick={() => reintentar(m)} className="mt-1 block text-2xs underline">
                      No se envió — reintentar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="safe-bottom flex gap-2 border-t border-borde bg-superficie p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          placeholder="Escribí un mensaje…"
          className="flex-1 rounded-full border border-borde px-4 py-2.5 text-base placeholder:text-texto-tenue focus:border-accion"
        />
        <button
          type="submit"
          disabled={!texto.trim()}
          className="rounded-full bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto transition-colors hover:opacity-90 disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
