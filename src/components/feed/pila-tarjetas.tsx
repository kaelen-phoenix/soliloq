"use client";

import { useMemo, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { ROLES_EJEMPLO } from "@/lib/onboarding-ejemplo";
import { opcionesDeRadio, radioMasCercano, type UnidadDistancia } from "@/lib/ubicacion";
import { TarjetaRol, type RolFeed } from "./tarjeta-rol";

const UMBRAL_SWIPE = 120;

export function PilaTarjetas({
  talentoId,
  radioInicialMetros,
  unidadInicial,
  rolesIniciales,
  mostrarEjemplos,
}: {
  talentoId: string;
  radioInicialMetros: number | null;
  unidadInicial: UnidadDistancia;
  rolesIniciales: RolFeed[];
  /** Primera vez de esta cuenta: van las tarjetas de ejemplo antes que las reales. */
  mostrarEjemplos: boolean;
}) {
  // Se guardan aparte de `roles` a propósito: `recargar` reemplaza el feed entero al cambiar
  // la distancia, y si los ejemplos vivieran ahí adentro desaparecerían a mitad del
  // onboarding por tocar un filtro.
  const [ejemplos, setEjemplos] = useState<RolFeed[]>(mostrarEjemplos ? ROLES_EJEMPLO : []);
  const [roles, setRoles] = useState(rolesIniciales);
  const [indice, setIndice] = useState(0);
  const [radio, setRadio] = useState<number | null>(radioInicialMetros);
  const [unidad, setUnidad] = useState<UnidadDistancia>(unidadInicial);
  const [recargando, setRecargando] = useState(false);
  // Solo se averigua cuando el feed queda vacío: sirve para no confundir "no llegás" con
  // "ya viste todo".
  const [hayFueraDelRadio, setHayFueraDelRadio] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const controles = useAnimation();

  // El filtro por distancia y por género ya vino resuelto de Postgres; acá solo se avanza.
  // Los ejemplos que queden van adelante, así el onboarding se ve antes que lo real.
  const pila = useMemo(() => [...ejemplos, ...roles.slice(indice)], [ejemplos, roles, indice]);

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

  async function registrarDecision(rol: RolFeed, decision: "postular" | "descartar") {
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

  function avanzar(rol: RolFeed, decision: "postular" | "descartar") {
    setAvisoError(null);
    controles.set({ x: 0, rotate: 0 });

    // Un ejemplo no se guarda en ningún lado: no hay obra, no hay creador y no hay quién
    // apruebe. Postularse acá es parte del tutorial, no una postulación.
    if (rol.es_ejemplo) {
      const quedan = ejemplos.filter((e) => e.rol_id !== rol.rol_id);
      setEjemplos(quedan);
      if (quedan.length === 0) marcarOnboardingVisto();
      return;
    }

    setIndice((i) => i + 1);
    registrarDecision(rol, decision);
  }

  async function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!actual) return;
    if (info.offset.x > UMBRAL_SWIPE) {
      await controles.start({ x: 500, rotate: 12, transition: { duration: 0.18 } });
      avanzar(actual, "postular");
    } else if (info.offset.x < -UMBRAL_SWIPE) {
      await controles.start({ x: -500, rotate: -12, transition: { duration: 0.18 } });
      avanzar(actual, "descartar");
    } else {
      controles.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  }

  return (
    <main className="flex flex-col px-5 py-4">
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="radio" className="text-2xs font-medium text-ink-400">
          Distancia
        </label>
        <select
          id="radio"
          value={opcionActual.metros ?? ""}
          disabled={recargando}
          onChange={(e) => cambiarRadio(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-lg border border-borde bg-superficie px-2 py-1 text-2xs font-medium text-texto focus:border-ink-900"
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
      </div>

      {avisoError && <p className="mb-3 text-xs text-error-600">{avisoError}</p>}

      {/* Sólo mientras haya ejemplos arriba de la pila. Dice cuántos faltan para que se lea
          como algo que termina, no como el estado normal de la app. */}
      {actual?.es_ejemplo && (
        <div className="mb-3 rounded-xl border border-brand-500/30 bg-brand-500/5 px-3.5 py-2.5">
          <p className="text-sm font-medium text-texto">Así funciona Yalope</p>
          <p className="mt-0.5 text-xs leading-snug text-texto-tenue">
            Deslizá a la derecha para postularte, a la izquierda para descartar. Cuando alguien
            te aprueba se abre una sala con el equipo. Estas {ejemplos.length}{" "}
            {ejemplos.length === 1 ? "tarjeta es un ejemplo" : "tarjetas son ejemplos"} — después
            siguen las convocatorias reales.
          </p>
        </div>
      )}

      <div className="relative mx-auto h-[500px] w-full max-w-sm">
        {siguiente && (
          <div className="absolute inset-0 scale-[0.96] opacity-40 blur-[0.5px]">
            <TarjetaRol rol={siguiente} />
          </div>
        )}

        {actual ? (
          <motion.div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            animate={controles}
            onDragEnd={onDragEnd}
          >
            <TarjetaRol rol={actual} />
          </motion.div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-borde px-10 text-center">
            <Icono nombre="feed" className="h-8 w-8 text-ink-300" />
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
                  className="mt-4 rounded-lg border border-ink-900 px-3 py-1.5 text-xs font-medium text-texto"
                >
                  Buscar en todo el mundo
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-base font-medium text-texto">
                  No hay convocatorias nuevas
                </p>
                <p className="mt-1 text-sm text-texto-tenue">
                  Volvé más tarde a ver nuevas propuestas.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {actual && (
        <div className="mx-auto mt-7 flex items-center gap-5">
          <button
            type="button"
            onClick={() => avanzar(actual, "descartar")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-borde bg-superficie text-texto-tenue transition-colors hover:border-ink-300 hover:text-texto"
            aria-label="Descartar"
          >
            <Icono nombre="cruz" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => avanzar(actual, "postular")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-tarjeta transition-colors hover:bg-brand-600"
            aria-label="Postularme"
          >
            <Icono nombre="corazon" className="h-7 w-7" relleno />
          </button>
        </div>
      )}
    </main>
  );
}
