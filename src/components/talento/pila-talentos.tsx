"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { usePrefiereReduccion } from "@/components/ui/movimiento";
import { Superposicion } from "@/components/ui/superposicion";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { marcarInteresEnTalento, marcarMatchMostrado } from "@/app/(sitio)/(app)/matches/acciones";
import { avisarConvocatoriasNuevas } from "@/components/convocatorias/convocatorias-nuevas";
import type { ResultadoTalento } from "./tarjeta-talento";

export interface IniciativaPlaca {
  /** Para qué Proyecto o Equipo se busca (#294): ahí se marca el interés. */
  tipo: "obra" | "equipo";
  id: string;
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
  const t = useTranslations("proyectos.pilaTalentos");
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
        {t.rich("sinIniciativa", {
          enlace: (chunks) => (
            <Link href="/proyectos" className="font-medium text-texto underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    );
  }

  if (!arriba) {
    return (
      <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-3 text-sm text-texto-tenue">
        {t("sinMas")}
      </p>
    );
  }

  function siguiente() {
    x.set(0);
    setDescartados((prev) => new Set(prev).add(arriba.id));
    if (pila.length <= 3) onCasiVacia();
  }

  async function decidir(interesa: boolean) {
    if (ocupado || !iniciativa) return;
    setOcupado(true);
    setError(null);
    const t = arriba;

    const res = await marcarInteresEnTalento(t.id, interesa, { tipo: iniciativa.tipo, id: iniciativa.id });
    if (!res.ok) {
      setError(res.error);
      setOcupado(false);
      x.set(0);
      return;
    }

    if (interesa) {
      // ¿Se formó match? (el trigger lo crea si el interés era mutuo)
      const supabase = createClient();
      const { data, error } = await supabase.rpc("mis_matches");
      if (error) reportarErrorSupabase(error, { rpc: "mis_matches", talentoId: t.id });
      // Del mismo talento puede haber un match anterior con otra iniciativa: se mira el de esta.
      const m = (data ?? []).find(
        (x) =>
          x.talento_id === t.id &&
          x.es_equipo === (iniciativa.tipo === "equipo") &&
          x.iniciativa_titulo === iniciativa.titulo,
      );
      if (m) {
        setPlaca({ talento: t, matchId: m.match_id });
        setOcupado(false);
        return; // la placa maneja el avance
      }
    }

    setOcupado(false);
    siguiente();
  }

  /**
   * #365: la primera ventana del match no convoca ni descarta, solo avisa. «Aceptar» (o
   * cerrarla) deja al Talento en Convocatorias —el match ya está ahí desde que existe—, donde
   * se lo gestiona. Se marca como mostrado para que la misma ventana no vuelva a salir al
   * entrar a Convocatorias, y se enciende el corazón de la navegación (#366).
   */
  async function aceptarMatch() {
    if (!placa || ocupado) return;
    const { talento, matchId } = placa;
    setOcupado(true);
    setError(null);
    const res = await marcarMatchMostrado(matchId);
    setOcupado(false);
    // Si no se pudo marcar, la ventana queda abierta con el error para volver a intentar.
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPlaca(null);
    setDescartados((prev) => new Set(prev).add(talento.id));
    if (pila.length <= 3) onCasiVacia();
    avisarConvocatoriasNuevas();
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
              {t("selloNo")}
            </motion.span>
            <motion.span
              style={{ opacity: opacitySi }}
              className="absolute right-4 top-4 rounded-lg border-2 border-coral px-2 py-0.5 text-sm font-bold uppercase text-coral"
            >
              {t("selloSi")}
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
          aria-label={t("noMeInteresa")}
          disabled={ocupado}
          onClick={() => decidir(false)}
          className={`${btnRedondo} border-borde text-texto-tenue`}
        >
          <Icono nombre="cruz" className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label={t("meInteresa")}
          disabled={ocupado}
          onClick={() => decidir(true)}
          className={`${btnRedondo} brillo-accion border-transparent bg-accion text-white`}
        >
          <Icono nombre="corazon" relleno className="h-6 w-6" />
        </button>
      </div>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {placa && (
        <Superposicion onCerrar={aceptarMatch} etiqueta={t("hayInteres")}>
          <div className="mx-auto w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral-700">
              {t("hayInteres")}
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
            {error && <p className="mt-3 text-xs text-error-600">{error}</p>}
            <button
              type="button"
              disabled={ocupado}
              onClick={aceptarMatch}
              className="mt-5 w-full rounded-full bg-accion px-4 py-2.5 text-sm font-semibold text-accion-texto disabled:opacity-50"
            >
              {ocupado ? "…" : t("aceptar")}
            </button>
          </div>
        </Superposicion>
      )}
    </div>
  );
}
