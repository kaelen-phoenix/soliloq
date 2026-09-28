"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import type { RolUsuario } from "@/lib/supabase/types";

/**
 * Tour guiado de la primera vez (#231). Se muestra en la pantalla principal (`/`) de cada
 * experiencia mientras su marca en `perfiles` (0084) esté en null; terminarlo u omitirlo la
 * escribe y no vuelve a aparecer solo (se puede repetir desde Ajustes).
 *
 * Cada paso señala un elemento real por su `data-tour` (barra de navegación, campanita,
 * «Buscar talento», el corazón del feed). Si ese elemento no está en pantalla —p. ej. el
 * feed vacío no tiene corazón—, el globo sale centrado en vez de apuntar a la nada.
 *
 * Mientras está abierto, una capa atrapa los clics: la app no se usa a medias. Esc = omitir.
 */

type Paso = { clave: string; ancla?: string; soloSiNoVioElOtro?: boolean };

const PASOS: Record<RolUsuario, Paso[]> = {
  talento: [
    { clave: "bienvenida" },
    { clave: "explorar", ancla: "nav-inicio" },
    { clave: "meInteresa", ancla: "me-interesa" },
    { clave: "match" },
    { clave: "chats", ancla: "nav-salas" },
    { clave: "notificaciones", ancla: "campanita" },
    // El Perfil es compartido: si ya se presentó en el otro tour, no se repite.
    { clave: "perfil", ancla: "nav-perfil", soloSiNoVioElOtro: true },
  ],
  creador: [
    { clave: "bienvenida" },
    { clave: "misProyectos", ancla: "nav-inicio" },
    { clave: "buscar", ancla: "buscar-talento" },
    { clave: "callBack", ancla: "nav-matches" },
    { clave: "convocar", ancla: "nav-matches" },
    { clave: "chats", ancla: "nav-salas" },
    { clave: "perfil", ancla: "nav-perfil", soloSiNoVioElOtro: true },
  ],
};

const MARGEN = 16;
const HOLGURA = 6;

/** El elemento visible con ese `data-tour`: hay dos barras de navegación (abajo y lateral)
 *  y según el ancho una de las dos está oculta. */
function buscarAncla(id: string): HTMLElement | null {
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return (
    candidatos.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    }) ?? null
  );
}

export function TourGuiado({
  userId,
  modo,
  vistoTalento,
  vistoCreador,
}: {
  userId: string;
  modo: RolUsuario;
  vistoTalento: boolean;
  vistoCreador: boolean;
}) {
  const t = useTranslations("tour");
  const pathname = usePathname();
  const router = useRouter();
  // «Ver el recorrido de nuevo» llega con `?tour=1`: lo abre sin depender de que el layout
  // ya tenga la marca nueva (un `router.refresh()` anterior puede llegar tarde con la vieja).
  const forzado = useSearchParams().get("tour") === "1";
  const visto = modo === "talento" ? vistoTalento : vistoCreador;
  const vioElOtro = modo === "talento" ? vistoCreador : vistoTalento;
  const pasos = PASOS[modo].filter((p) => !(p.soloSiNoVioElOtro && vioElOtro));

  const [cerrado, setCerrado] = useState(false);
  const [listo, setListo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const globoRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const [altoGlobo, setAltoGlobo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(false);

  const activo = (!visto || forzado) && !cerrado && pathname === "/";
  const paso = pasos[indice];

  // Se espera a que la pantalla termine de pintar: las anclas (tarjetas del feed, el
  // botón de «Buscar talento») aparecen después del primer render.
  useEffect(() => {
    if (!activo) return;
    const id = setTimeout(() => setListo(true), 600);
    return () => clearTimeout(id);
  }, [activo]);

  // Si cambia la marca desde el servidor, o se pide verlo de nuevo, arranca de cero.
  useEffect(() => {
    if (!visto || forzado) {
      setCerrado(false);
      setIndice(0);
    }
  }, [visto, modo, forzado]);

  const medir = useCallback(() => {
    if (!paso?.ancla) {
      setRect(null);
      return;
    }
    const el = buscarAncla(paso.ancla);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [paso]);

  useLayoutEffect(() => {
    if (!activo || !listo || !paso) return;
    if (paso.ancla) buscarAncla(paso.ancla)?.scrollIntoView({ block: "nearest" });
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [activo, listo, paso, medir]);

  useLayoutEffect(() => {
    if (globoRef.current) setAltoGlobo(globoRef.current.offsetHeight);
    botonRef.current?.focus();
  }, [indice, listo, rect]);

  // Se cierra recién con la marca guardada: si falla, el tour sigue abierto con un aviso y
  // se puede reintentar, en vez de cerrarse "visto" sin estarlo. `router.refresh()` trae la
  // marca nueva al layout, así «Ver el recorrido de nuevo» (que la vuelve a null) se nota
  // como un cambio y el tour arranca otra vez sin recargar la página.
  const terminar = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    setErrorGuardado(false);
    const ahora = new Date().toISOString();
    const { error } = await createClient()
      .from("perfiles")
      .update(modo === "talento" ? { tour_talento_visto_en: ahora } : { tour_creador_visto_en: ahora })
      .eq("id", userId);
    setGuardando(false);
    if (error) {
      reportarErrorSupabase(error, { accion: "marcar tour visto", modo });
      setErrorGuardado(true);
      return;
    }
    setCerrado(true);
    if (forzado) router.replace("/");
    router.refresh();
  }, [guardando, modo, userId, router, forzado]);

  // Mientras está abierto: Esc = omitir; Tab no sale del globo; y las flechas no llegan a la
  // app — el feed descarta o marca «Me interesa» con ← / →, y eso no puede pasar detrás del
  // globo. Va en captura sobre `window` para correr antes que esos atajos.
  useEffect(() => {
    if (!activo || !listo) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        terminar();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (e.key === "Tab" && globoRef.current) {
        const enfocables = Array.from(
          globoRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"),
        );
        if (enfocables.length === 0) return;
        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        const actual = document.activeElement;
        if (!globoRef.current.contains(actual)) {
          e.preventDefault();
          primero.focus();
        } else if (e.shiftKey && actual === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && actual === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    }
    window.addEventListener("keydown", alTeclear, true);
    return () => window.removeEventListener("keydown", alTeclear, true);
  }, [activo, listo, terminar]);

  // Al cerrar, el foco vuelve adonde estaba antes de abrir.
  useEffect(() => {
    if (!activo || !listo) return;
    const previo = document.activeElement as HTMLElement | null;
    return () => previo?.focus?.();
  }, [activo, listo]);

  if (!activo || !listo || !paso) return null;

  const esUltimo = indice === pasos.length - 1;
  const base = `${modo}.${paso.clave}`;

  // Globo: debajo del elemento si entra, si no arriba; centrado en pantalla sin ancla.
  const anchoPantalla = typeof window !== "undefined" ? window.innerWidth : 390;
  const altoPantalla = typeof window !== "undefined" ? window.innerHeight : 800;
  const ancho = Math.min(320, anchoPantalla - MARGEN * 2);
  let estiloGlobo: React.CSSProperties;
  if (rect) {
    const abajo = rect.bottom + HOLGURA + 12;
    const entraAbajo = abajo + altoGlobo + MARGEN <= altoPantalla;
    const top = entraAbajo ? abajo : Math.max(MARGEN, rect.top - HOLGURA - 12 - altoGlobo);
    const centro = rect.left + rect.width / 2;
    const left = Math.min(Math.max(MARGEN, centro - ancho / 2), anchoPantalla - ancho - MARGEN);
    estiloGlobo = { top, left, width: ancho };
  } else {
    estiloGlobo = {
      top: Math.max(MARGEN, (altoPantalla - altoGlobo) / 2),
      left: (anchoPantalla - ancho) / 2,
      width: ancho,
    };
  }

  return (
    <div className="fixed inset-0 z-[60]" data-tour-activo>
      {/* Capa que atenúa todo y atrapa los clics. Con ancla, el "agujero" lo hace la sombra
          gigante del recuadro de abajo; sin ancla, se atenúa la pantalla entera. */}
      <div className={`absolute inset-0 ${rect ? "" : "bg-black/70"}`} aria-hidden="true" />
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand-400 transition-all duration-200"
          style={{
            top: rect.top - HOLGURA,
            left: rect.left - HOLGURA,
            width: rect.width + HOLGURA * 2,
            height: rect.height + HOLGURA * 2,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.72), 0 0 24px 4px rgb(242 87 30 / 0.45)",
          }}
        />
      )}

      <div
        ref={globoRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("etiqueta")}
        aria-describedby="tour-titulo tour-texto"
        className="absolute rounded-2xl border border-borde bg-fondo-sutil p-4 shadow-tarjeta"
        style={estiloGlobo}
      >
        <p className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("paso", { n: indice + 1, total: pasos.length })}
        </p>
        <h2 id="tour-titulo" className="mt-1 font-display text-lg font-semibold text-texto">
          {t(`${base}.titulo`)}
        </h2>
        <p id="tour-texto" className="mt-1.5 text-sm leading-relaxed text-texto-tenue">
          {t(`${base}.texto`)}
        </p>
        {errorGuardado && (
          <p role="alert" className="mt-2 text-xs text-error-600">
            {t("errorGuardar")}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          {!esUltimo ? (
            <button
              type="button"
              onClick={terminar}
              className="rounded-full px-2 py-1.5 text-sm font-medium text-texto-tenue transition-colors hover:text-texto"
            >
              {t("omitir")}
            </button>
          ) : (
            <span />
          )}
          <Boton
            ref={botonRef}
            cargando={guardando}
            textoCargando={t("guardando")}
            onClick={() => (esUltimo ? terminar() : setIndice((i) => i + 1))}
          >
            {esUltimo ? t("entendido") : t("siguiente")}
          </Boton>
        </div>
      </div>
    </div>
  );
}
