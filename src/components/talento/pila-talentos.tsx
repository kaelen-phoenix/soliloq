"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { usePrefiereReduccion } from "@/components/ui/movimiento";
import { createClient } from "@/lib/supabase/client";
import { marcarInteresEnTalento, convocarMatch } from "@/app/(app)/matches/acciones";
import type { ResultadoTalento } from "./tarjeta-talento";

export interface IniciativaPlaca {
  titulo: string;
  fotoUrl: string | null;
}

interface Placa {
  talento: ResultadoTalento;
  matchId: string;
}

export function PilaTalentos({
  talentos,
  iniciativa,
  onCasiVacia,
}: {
  talentos: ResultadoTalento[];
  /** `null` si el creador no tiene proyecto/equipo activo. */
  iniciativa: IniciativaPlaca | null;
  /** Se llama cuando quedan pocas tarjetas, para traer más. */
  onCasiVacia: () => void;
}) {
  const router = useRouter();
  const prefiereReduccion = usePrefiereReduccion();
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [placa, setPlaca] = useState<Placa | null>(null);
  const [error, setError] = useState<string | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacityNo = useTransform(x, [-120, -20], [1, 0]);
  const opacitySi = useTransform(x, [20, 120], [0, 1]);

  const pila = useMemo(
    () => talentos.filter((t) => !descartados.has(t.id)),
    [talentos, descartados],
  );
  const arriba = pila[0];

  if (!iniciativa) {
    return (
      <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
        Creá un proyecto o equipo para empezar a buscar talento.
      </p>
    );
  }

  if (!arriba) {
    return (
      <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
        Por ahora no hay más perfiles. Probá aflojando los filtros o volvé más tarde.
      </p>
    );
  }

  function siguiente() {
    x.set(0);
    setDescartados((prev) => new Set(prev).add(arriba.id));
    if (pila.length <= 3) onCasiVacia();
  }

  async function decidir(interesa: boolean) {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    const t = arriba;

    const res = await marcarInteresEnTalento(t.id, interesa);
    if (!res.ok) {
      setError(res.error);
      setOcupado(false);
      x.set(0);
      return;
    }

    if (interesa) {
      // ¿Se formó match? (el trigger lo crea si el interés era mutuo)
      const supabase = createClient();
      const { data } = await supabase.rpc("mis_matches");
      const m = (data ?? []).find((x) => x.talento_id === t.id && !x.convocado);
      if (m) {
        setPlaca({ talento: t, matchId: m.match_id });
        setOcupado(false);
        return; // la placa maneja el avance
      }
    }

    setOcupado(false);
    siguiente();
  }

  async function enviarAConvocados() {
    if (!placa) return;
    setOcupado(true);
    const res = await convocarMatch(placa.matchId);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    cerrarPlaca();
  }

  /** Cerrar sin convocar: el match queda igual en `/matches`, no se pierde. */
  function cerrarPlaca() {
    if (!placa) return;
    const id = placa.talento.id;
    setPlaca(null);
    setDescartados((prev) => new Set(prev).add(id));
    if (pila.length <= 3) onCasiVacia();
  }

  const btnRedondo =
    "flex h-14 w-14 items-center justify-center rounded-full border-2 bg-superficie shadow-tarjeta transition-transform active:scale-95 disabled:opacity-40";

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-[3/4] w-full max-w-sm">
        {pila[1] && (
          <div className="absolute inset-0 scale-[0.96] overflow-hidden rounded-2xl border border-borde bg-superficie opacity-60" />
        )}
        <AnimatePresence>
          <motion.button
            key={arriba.id}
            type="button"
            onClick={() => router.push(`/talentos/${arriba.id}`)}
            className="absolute inset-0 block overflow-hidden rounded-2xl border border-borde bg-ink-950 text-left"
            style={prefiereReduccion ? undefined : { x, rotate }}
            drag={prefiereReduccion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              const fuerza = info.offset.x + info.velocity.x * 0.2;
              if (fuerza < -110) decidir(false);
              else if (fuerza > 110) decidir(true);
              else x.set(0);
            }}
            initial={prefiereReduccion ? false : { scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={prefiereReduccion ? undefined : { opacity: 0 }}
          >
            {arriba.fotoUrl && (
              <Imagen src={arriba.fotoUrl} alt={arriba.nombre} fill absoluto sizes="384px" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />

            <motion.span
              style={{ opacity: opacityNo }}
              className="absolute left-4 top-4 rounded-lg border-2 border-white px-2 py-0.5 text-sm font-bold uppercase text-white"
            >
              No
            </motion.span>
            <motion.span
              style={{ opacity: opacitySi }}
              className="absolute right-4 top-4 rounded-lg border-2 border-coral px-2 py-0.5 text-sm font-bold uppercase text-coral"
            >
              Sí
            </motion.span>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-xl font-semibold leading-tight">
                {arriba.nombre}
                {arriba.edad != null && (
                  <span className="font-normal text-white/80"> · {arriba.edad}</span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-white/70">{arriba.ubicacion_publica}</p>
              {arriba.habilidades.length > 0 && (
                <p className="mt-1 truncate text-xs text-white/60">
                  {arriba.habilidades.slice(0, 4).join(" · ")}
                </p>
              )}
            </div>
          </motion.button>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label="No me interesa"
          disabled={ocupado}
          onClick={() => decidir(false)}
          className={`${btnRedondo} border-borde text-texto-tenue`}
        >
          <Icono nombre="cruz" className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Me interesa"
          disabled={ocupado}
          onClick={() => decidir(true)}
          className={`${btnRedondo} border-coral text-coral-700`}
        >
          <Icono nombre="corazon" relleno className="h-6 w-6" />
        </button>
      </div>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {placa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral-700">
              Hay interés
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {placa.talento.fotoUrl ? (
                <Imagen
                  src={placa.talento.fotoUrl}
                  alt={placa.talento.nombre}
                  width={64}
                  height={64}
                  contenedorClassName="h-16 w-16 rounded-full"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
                  {placa.talento.nombre[0]}
                </span>
              )}
              <Icono nombre="corazon" relleno className="h-5 w-5 text-coral" />
              {iniciativa.fotoUrl ? (
                <Imagen
                  src={iniciativa.fotoUrl}
                  alt={iniciativa.titulo}
                  width={64}
                  height={64}
                  contenedorClassName="h-16 w-16 rounded-xl"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-100 text-2xs font-medium text-texto-tenue">
                  {iniciativa.titulo}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-texto">
              {placa.talento.nombre} y «{iniciativa.titulo}»
            </p>
            {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
            <button
              type="button"
              disabled={ocupado}
              onClick={enviarAConvocados}
              className="mt-4 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto disabled:opacity-50"
            >
              {ocupado ? "…" : "Enviar a Convocados"}
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={cerrarPlaca}
              className="mt-2 w-full py-1.5 text-xs font-medium text-texto-tenue hover:text-texto disabled:opacity-50"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
