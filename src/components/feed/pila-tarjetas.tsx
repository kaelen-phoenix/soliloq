"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { usePrefiereReduccion } from "@/components/ui/movimiento";
import { createClient } from "@/lib/supabase/client";
import { ROLES_EJEMPLO } from "@/lib/onboarding-ejemplo";
import { opcionesDeRadio, radioMasCercano, type UnidadDistancia } from "@/lib/ubicacion";
import { TarjetaRol, type RolFeed } from "./tarjeta-rol";
import { TarjetaEquipo, type EquipoFeed } from "./tarjeta-equipo";

const UMBRAL_SWIPE = 120;

type Decision = "postular" | "descartar";

// La pila mezcla dos cosas: roles de un proyecto y equipos. Se etiquetan para que la
// tarjeta y la decisión sepan con qué están tratando.
type ItemFeed =
  | { kind: "rol"; data: RolFeed }
  | { kind: "equipo"; data: EquipoFeed };

// Un golpecito corto al decidir. No todos los navegadores lo tienen (iOS Safari no).
function vibrar() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(12);
  }
}

export function PilaTarjetas({
  talentoId,
  radioInicialMetros,
  unidadInicial,
  rolesIniciales,
  equiposIniciales,
  mostrarEjemplos,
}: {
  talentoId: string;
  radioInicialMetros: number | null;
  unidadInicial: UnidadDistancia;
  rolesIniciales: RolFeed[];
  equiposIniciales: EquipoFeed[];
  /** Primera vez de esta cuenta: van las tarjetas de ejemplo antes que las reales. */
  mostrarEjemplos: boolean;
}) {
  // Se guardan aparte de `roles` a propósito: `recargar` reemplaza el feed entero al cambiar
  // la distancia, y si los ejemplos vivieran ahí adentro desaparecerían a mitad del
  // onboarding por tocar un filtro.
  const [ejemplos, setEjemplos] = useState<RolFeed[]>(mostrarEjemplos ? ROLES_EJEMPLO : []);
  const [roles, setRoles] = useState(rolesIniciales);
  // Los equipos van al final de la pila, después de los roles. No entran en "Deshacer":
  // marcar interés le avisa al creador, y deshacer eso es raro. Al decidir, se sacan de acá.
  const [equipos, setEquipos] = useState(equiposIniciales);
  const [indice, setIndice] = useState(0);
  const [radio, setRadio] = useState<number | null>(radioInicialMetros);
  const [unidad, setUnidad] = useState<UnidadDistancia>(unidadInicial);
  const [recargando, setRecargando] = useState(false);
  // Solo se averigua cuando el feed queda vacío: sirve para no confundir "no llegás" con
  // "ya viste todo".
  const [hayFueraDelRadio, setHayFueraDelRadio] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  // Últimas decisiones reales, para "Deshacer". Los ejemplos no entran acá.
  const [historial, setHistorial] = useState<{ rol: RolFeed; decision: Decision }[]>([]);

  const prefiereReduccion = usePrefiereReduccion();

  // La posición de la tarjeta de arriba. De acá cuelgan el giro y los sellos "Me interesa"
  // / "Paso", así el gesto tiene respuesta visual mientras se arrastra, no solo al soltar.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], prefiereReduccion ? [0, 0] : [-14, 14]);
  const opacidadSi = useTransform(x, [30, 130], [0, 1]);
  const opacidadNo = useTransform(x, [-130, -30], [1, 0]);

  // El filtro por distancia y por género ya vino resuelto de Postgres; acá solo se avanza.
  // Los ejemplos que queden van adelante, así el onboarding se ve antes que lo real; los
  // equipos van al final.
  const pila = useMemo<ItemFeed[]>(
    () => [
      ...ejemplos.map((r) => ({ kind: "rol" as const, data: r })),
      ...roles.slice(indice).map((r) => ({ kind: "rol" as const, data: r })),
      ...equipos.map((e) => ({ kind: "equipo" as const, data: e })),
    ],
    [ejemplos, roles, indice, equipos]
  );

  const actual = pila[0];
  const siguiente = pila[1];

  const opciones = opcionesDeRadio(unidad);
  const opcionActual = radioMasCercano(radio, unidad);

  /**
   * Cambiar el radio es volver a pedir el feed, no filtrar lo que ya está en memoria:
   * filtrar en el navegador obligaría a traerse todos los roles del mundo para descartarlos.
   */
  async function recargar(nuevoRadio: number | null, nuevaUnidad: UnidadDistancia) {
    setRecargando(true);
    setAvisoError(null);
    const supabase = createClient();

    await supabase
      .from("perfiles_talento")
      .update({ radio_busqueda_metros: nuevoRadio, unidad_distancia: nuevaUnidad })
      .eq("id", talentoId);

    const { data, error } = await supabase.rpc("feed_para_talento", {
      p_talento_id: talentoId,
      p_radio_metros: nuevoRadio,
    });

    if (error) {
      setRecargando(false);
      setAvisoError("No pudimos actualizar el feed. Probá de nuevo.");
      return;
    }

    const nuevos = data ?? [];
    setRoles(nuevos);
    setIndice(0);
    // El feed cambió entero: lo que había para deshacer ya no está en pantalla.
    setHistorial([]);

    // La consulta de más se paga únicamente en el caso vacío, que es el único donde hay algo
    // que explicar.
    if (nuevos.length === 0 && nuevoRadio !== null) {
      const { data: sinRadio } = await supabase.rpc("feed_para_talento", {
        p_talento_id: talentoId,
        p_radio_metros: null,
      });
      setHayFueraDelRadio((sinRadio ?? []).length > 0);
    } else {
      setHayFueraDelRadio(false);
    }

    setRecargando(false);
  }

  function cambiarRadio(metros: number | null) {
    setRadio(metros);
    recargar(metros, unidad);
  }

  function cambiarUnidad(nueva: UnidadDistancia) {
    // El radio en metros no se convierte ni se toca: cambia cómo se lee, no qué se busca.
    setUnidad(nueva);
    recargar(radio, nueva);
  }

  async function registrarDecision(rol: RolFeed, decision: Decision) {
    const supabase = createClient();
    const tabla = decision === "postular" ? "postulaciones" : "descartes";
    const { error } = await supabase
      .from(tabla)
      .upsert(
        { rol_id: rol.rol_id, talento_id: talentoId },
        { onConflict: "rol_id,talento_id", ignoreDuplicates: true }
      );

    if (error) {
      setAvisoError(
        decision === "postular"
          ? "No pudimos registrar tu postulación. Probá de nuevo."
          : "No pudimos guardar el descarte. Probá de nuevo."
      );
      setRoles((prev) => [rol, ...prev]);
      setHistorial((prev) => prev.filter((h) => h.rol.rol_id !== rol.rol_id));
    }
  }

  /**
   * Cierra el onboarding para esta cuenta. Se hace al despachar la última tarjeta de
   * ejemplo, no al mostrarlas: si alguien cierra la app en la primera, la próxima vez las
   * vuelve a tener, que es lo que se espera de un tutorial a medio hacer.
   *
   * Un fallo acá no se le muestra a nadie ni bloquea nada. El peor caso es volver a ver el
   * ejemplo una vez más — muy por debajo de interrumpir el feed con un cartel de error por
   * algo que a la persona no le cambia nada.
   */
  async function marcarOnboardingVisto() {
    const supabase = createClient();
    await supabase
      .from("perfiles_talento")
      .update({ onboarding_visto_en: new Date().toISOString() })
      .eq("id", talentoId);
  }

  async function registrarInteresEquipo(equipo: EquipoFeed, decision: Decision) {
    const supabase = createClient();
    const { error } = await supabase.rpc("interes_en_equipo", {
      p_equipo_id: equipo.equipo_id,
      p_interesa: decision === "postular",
    });
    if (error) {
      setAvisoError("No pudimos registrar tu decisión. Probá de nuevo.");
      setEquipos((prev) => [equipo, ...prev]);
    }
  }

  const avanzar = useCallback(
    (item: ItemFeed, decision: Decision) => {
      setAvisoError(null);
      x.set(0);
      vibrar();

      if (item.kind === "equipo") {
        // Los equipos no tienen "Deshacer": se sacan de la pila y listo.
        setEquipos((prev) => prev.filter((e) => e.equipo_id !== item.data.equipo_id));
        registrarInteresEquipo(item.data, decision);
        return;
      }

      const rol = item.data;

      // Un ejemplo no se guarda en ningún lado: no hay obra, no hay creador y no hay quién
      // apruebe. Postularse acá es parte del tutorial, no una postulación.
      if (rol.es_ejemplo) {
        const quedan = ejemplos.filter((e) => e.rol_id !== rol.rol_id);
        setEjemplos(quedan);
        if (quedan.length === 0) marcarOnboardingVisto();
        return;
      }

      setIndice((i) => i + 1);
      setHistorial((prev) => [...prev, { rol, decision }].slice(-10));
      registrarDecision(rol, decision);
    },
    // `registrarDecision`, `registrarInteresEquipo` y `marcarOnboardingVisto` solo tocan
    // setState y la red con `talentoId` (prop estable): no van en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ejemplos, x]
  );

  const salir = useCallback(
    async (decision: Decision) => {
      if (!actual || recargando) return;
      if (prefiereReduccion) {
        avanzar(actual, decision);
        return;
      }
      const signo = decision === "postular" ? 1 : -1;
      await animate(x, signo * 520, { duration: 0.18, ease: "easeOut" });
      avanzar(actual, decision);
    },
    [actual, recargando, avanzar, x, prefiereReduccion]
  );

  /** Revierte la última decisión real: la borra de la base y vuelve a poner la tarjeta. */
  async function deshacer() {
    const ultima = historial[historial.length - 1];
    if (!ultima || recargando) return;

    setHistorial((prev) => prev.slice(0, -1));
    setIndice((i) => Math.max(0, i - 1));
    setAvisoError(null);
    x.set(0);

    const supabase = createClient();
    const tabla = ultima.decision === "postular" ? "postulaciones" : "descartes";
    const { error } = await supabase
      .from(tabla)
      .delete()
      .match({ rol_id: ultima.rol.rol_id, talento_id: talentoId });

    if (error) {
      setAvisoError("No pudimos deshacer. Probá de nuevo.");
      setHistorial((prev) => [...prev, ultima]);
      setIndice((i) => i + 1);
    }
  }

  function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!actual) return;
    if (info.offset.x > UMBRAL_SWIPE) {
      salir("postular");
    } else if (info.offset.x < -UMBRAL_SWIPE) {
      salir("descartar");
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  // Flechas del teclado en escritorio: ← descarta, → se postula. Se ignora si se está
  // escribiendo en un campo (el select de distancia, por ejemplo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        salir("postular");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        salir("descartar");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [salir]);

  return (
    <main className="flex flex-col px-5 py-4">
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="radio" className="text-2xs font-medium text-texto-tenue">
          Distancia
        </label>
        <select
          id="radio"
          value={opcionActual.metros ?? ""}
          disabled={recargando}
          onChange={(e) => cambiarRadio(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-lg border border-borde bg-superficie px-2 py-1 text-2xs font-medium text-texto focus:border-accion"
        >
          {opciones.map((o) => (
            <option key={o.etiqueta} value={o.metros ?? ""}>
              {o.etiqueta}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-borde">
          {(["km", "mi"] as const).map((u) => (
            <button
              key={u}
              type="button"
              disabled={recargando}
              onClick={() => cambiarUnidad(u)}
              className={`px-2 py-1 text-2xs font-medium transition-colors ${
                unidad === u ? "bg-accion text-accion-texto" : "text-texto-tenue hover:text-texto"
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {historial.length > 0 && (
          <button
            type="button"
            onClick={deshacer}
            disabled={recargando}
            className="ml-auto inline-flex items-center gap-1 text-2xs font-medium text-texto-tenue transition-colors hover:text-texto disabled:opacity-50"
          >
            <Icono nombre="cambiar" className="h-3.5 w-3.5" />
            Deshacer
          </button>
        )}
      </div>

      {avisoError && <p className="mb-3 text-xs text-error-600">{avisoError}</p>}

      {/* Sólo mientras haya ejemplos arriba de la pila. Dice cuántos faltan para que se lea
          como algo que termina, no como el estado normal de la app. */}
      {actual?.kind === "rol" && actual.data.es_ejemplo && (
        <div className="mb-3 rounded-xl border border-brand-500/30 bg-brand-500/5 px-3.5 py-2.5">
          <p className="text-sm font-medium text-texto">Así funciona Yalope</p>
          <p className="mt-0.5 text-xs leading-snug text-texto-tenue">
            Deslizá a la derecha para postularte, a la izquierda para descartar. Cuando alguien
            te aprueba se abre una sala con el equipo. Estas {ejemplos.length}{" "}
            {ejemplos.length === 1 ? "tarjeta es un ejemplo" : "tarjetas son ejemplos"} — después
            siguen las propuestas reales.
          </p>
        </div>
      )}

      <div className="relative mx-auto h-[500px] w-full max-w-sm">
        {siguiente &&
          (siguiente.kind === "rol" ? (
            <div className="absolute inset-0 scale-[0.96] opacity-40 blur-[0.5px]">
              <TarjetaRol rol={siguiente.data} />
            </div>
          ) : (
            <div className="absolute inset-0 scale-[0.96] opacity-40 blur-[0.5px]">
              <TarjetaEquipo equipo={siguiente.data} />
            </div>
          ))}

        {actual ? (
          <motion.div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={onDragEnd}
          >
            {actual.kind === "rol" ? (
              <TarjetaRol rol={actual.data} />
            ) : (
              <TarjetaEquipo equipo={actual.data} />
            )}

            {/* Sellos que aparecen con el gesto, tipo timbre sobre la tarjeta. */}
            <motion.div
              style={{ opacity: opacidadSi }}
              className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-lg border-2 border-exito-600 px-3 py-1 text-lg font-bold uppercase tracking-wide text-exito-600"
            >
              Me interesa
            </motion.div>
            <motion.div
              style={{ opacity: opacidadNo }}
              className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-lg border-2 border-ink-400 px-3 py-1 text-lg font-bold uppercase tracking-wide text-ink-400"
            >
              Paso
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-borde px-10 text-center">
            <Icono nombre="feed" className="h-8 w-8 text-texto-tenue" />
            {hayFueraDelRadio ? (
              <>
                <p className="mt-3 text-base font-medium text-texto">
                  No hay convocatorias tan cerca
                </p>
                <p className="mt-1 text-sm text-texto-tenue">
                  Hay convocatorias más lejos de {opcionActual.etiqueta}. Ampliá la distancia para
                  verlas.
                </p>
                <button
                  type="button"
                  onClick={() => cambiarRadio(null)}
                  className="mt-4 rounded-lg border border-texto px-3 py-1.5 text-xs font-medium text-texto"
                >
                  Buscar en todo el mundo
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-base font-medium text-texto">
                  No hay propuestas nuevas
                </p>
                <p className="mt-1 text-sm text-texto-tenue">
                  Volvé más tarde a ver nuevos proyectos y equipos.
                </p>
                {historial.length > 0 && (
                  <button
                    type="button"
                    onClick={deshacer}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-texto px-3 py-1.5 text-xs font-medium text-texto"
                  >
                    <Icono nombre="cambiar" className="h-3.5 w-3.5" />
                    Deshacer la última
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {actual && (
        <div className="mx-auto mt-7 flex items-center gap-5">
          <button
            type="button"
            onClick={() => salir("descartar")}
            disabled={recargando}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-borde bg-superficie text-texto-tenue transition-colors hover:border-ink-300 hover:text-texto disabled:opacity-50"
            aria-label="Descartar"
          >
            <Icono nombre="cruz" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => salir("postular")}
            disabled={recargando}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-tarjeta transition-colors hover:bg-brand-600 disabled:opacity-50"
            aria-label="Postularme"
          >
            <Icono nombre="corazon" className="h-7 w-7" relleno />
          </button>
        </div>
      )}
    </main>
  );
}
