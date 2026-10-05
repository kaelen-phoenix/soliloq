"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Imagen } from "@/components/ui/imagen";
import { createClient } from "@/lib/supabase/client";
import type { TipoNotificacion } from "@/lib/supabase/types";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { avisarCambioNotificaciones, cerrarPushDe, tagPush } from "@/lib/notificaciones-cliente";

type Obra = { titulo: string };

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  leida_en: string | null;
  creado_en: string;
  obra_id: string | null;
  rol_id: string | null;
  sala_id: string | null;
  /** Quién generó el interés, para `interes_recibido`. */
  de_perfil: string | null;
  obras: Obra | Obra[] | null;
  /** Foto del Perfil de Talento del Creador que publicó el proyecto (issue #175), ya
   *  resuelta a URL pública en el servidor. */
  proyecto_foto_url: string | null;
}

/** PostgREST devuelve la relación como objeto o como array según la cardinalidad que infiere. */
function primero<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/** `null` si la obra no vino (p. ej. la esconde un bloqueo): el texto lo pone quien llama. */
function tituloObra(n: Notificacion): string | null {
  return primero(n.obras)?.titulo ?? null;
}

function fotoDelProyecto(n: Notificacion): string | null {
  return n.proyecto_foto_url;
}

/**
 * Las dos caras del equipo, montadas una sobre otra. El anillo blanco es lo que las separa
 * cuando se superponen; sin él las dos fotos se funden en una mancha.
 */
function ParDeCaras({ propia, proyecto }: { propia: string | null; proyecto: string | null }) {
  const base = "h-9 w-9 shrink-0 rounded-full border-2 border-superficie bg-ink-100 object-cover";

  // El hueco relleno cuando falta la foto: sin él las dos caras se desalinean según quién
  // tenga imagen. Decorativo, así que va sin texto alternativo.
  const Cara = ({ url, extra = "" }: { url: string | null; extra?: string }) =>
    url ? (
      <Imagen
        src={url}
        alt=""
        width={36}
        height={36}
        contenedorClassName={`shrink-0 rounded-full border-2 border-superficie ${extra}`}
        fallback={<span className={`${base} ${extra}`} aria-hidden="true" />}
      />
    ) : (
      <span className={`${base} ${extra}`} aria-hidden="true" />
    );

  return (
    <span className="flex shrink-0 items-center">
      <Cara url={propia} />
      <Cara url={proyecto} extra="-ml-3" />
    </span>
  );
}

export function ListaNotificaciones({
  notificacionesIniciales,
  fotoPropia = null,
}: {
  notificacionesIniciales: Notificacion[];
  fotoPropia?: string | null;
}) {
  const [notificaciones, setNotificaciones] = useState(notificacionesIniciales);
  const router = useRouter();
  const t = useTranslations("chats.notificaciones");
  const locale = useLocale();
  const negrita = (texto: React.ReactNode) => <span className="font-medium">{texto}</span>;
  const titulo = (n: Notificacion) => tituloObra(n) ?? t("unaObra");

  const hayNoLeidas = notificaciones.some((n) => !n.leida_en);

  // #347: además de la base, se avisa a la campanita (que recuenta enseguida) y se cierra la
  // push del sistema si este aviso también llegó así. Si la base falla, vuelve a no leída.
  async function marcarLeida(id: string) {
    const previa = notificaciones.find((n) => n.id === id);
    if (!previa || previa.leida_en) return;
    const ahora = new Date().toISOString();
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida_en: ahora } : n)));
    const supabase = createClient();
    const { error } = await supabase.from("notificaciones").update({ leida_en: ahora }).eq("id", id);
    if (error) {
      reportarErrorSupabase(error, { accion: "marcar notificación leída", id });
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida_en: null } : n)));
      return;
    }
    avisarCambioNotificaciones();
    void cerrarPushDe([tagPush(previa)]);
  }

  async function marcarTodasLeidas() {
    const ahora = new Date().toISOString();
    const pendientes = notificaciones.filter((n) => !n.leida_en);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida_en: n.leida_en ?? ahora })));
    const supabase = createClient();
    const { error } = await supabase.from("notificaciones").update({ leida_en: ahora }).is("leida_en", null);
    if (error) {
      reportarErrorSupabase(error, { accion: "marcar todas las notificaciones leídas" });
      const ids = new Set(pendientes.map((n) => n.id));
      setNotificaciones((prev) => prev.map((n) => (ids.has(n.id) ? { ...n, leida_en: null } : n)));
      return;
    }
    avisarCambioNotificaciones();
    void cerrarPushDe(pendientes.map(tagPush));
  }

  async function abrir(n: Notificacion) {
    await marcarLeida(n.id);
    if ((n.tipo === "sala_creada" || n.tipo === "equipo_armado") && n.sala_id) {
      router.push(`/salas/${n.sala_id}`);
    } else if (n.tipo === "convocado") {
      // #143: el Talento confirma la convocatoria antes de entrar a la sala.
      router.push("/convocatoria");
    } else if (n.tipo === "match" && n.obra_id) {
      router.push(`/obras/${n.obra_id}`);
    } else if (n.tipo === "nuevo_match") {
      router.push("/matches");
    } else if (n.tipo === "solicitud_acceso") {
      router.push("/admin");
    } else if (n.tipo === "acceso_habilitado") {
      router.push("/perfil");
    }
  }

  if (notificaciones.length === 0) {
    return (
      <EstadoVacio
        icono="campana"
        titulo={t("vacioTitulo")}
        detalle={t("vacioDetalle")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hayNoLeidas && (
        <button
          type="button"
          onClick={marcarTodasLeidas}
          className="self-end text-xs font-medium text-texto-tenue hover:text-texto"
        >
          {t("marcarTodas")}
        </button>
      )}

      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
        {notificaciones.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => abrir(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                n.leida_en ? "border-borde bg-superficie" : "border-borde bg-fondo-sutil"
              }`}
            >
              {!n.leida_en && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}

              {/* `tipo` es el valor del enum en la base, no el texto: la etiqueta visible
                  cambió a "hay equipo" pero el dato almacenado sigue siendo `match`. */}
              {n.tipo === "match" && (
                <ParDeCaras propia={fotoPropia} proyecto={fotoDelProyecto(n)} />
              )}

              <div className={n.leida_en && n.tipo !== "match" ? "pl-[18px]" : ""}>
                {n.tipo === "match" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("match.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t.rich("match.texto", { titulo: titulo(n), b: negrita })}
                    </p>
                  </>
                ) : n.tipo === "convocado" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("convocado.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t.rich("convocado.texto", { titulo: titulo(n), b: negrita })}
                    </p>
                  </>
                ) : n.tipo === "equipo_armado" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("equipo_armado.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t("equipo_armado.texto")}
                    </p>
                  </>
                ) : n.tipo === "interes_recibido" ? (
                  <p className="text-base leading-snug text-texto">
                    {t("interes_recibido")}
                  </p>
                ) : n.tipo === "nuevo_match" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("nuevo_match.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t("nuevo_match.texto")}
                    </p>
                  </>
                ) : n.tipo === "solicitud_acceso" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("solicitud_acceso.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t("solicitud_acceso.texto")}
                    </p>
                  </>
                ) : n.tipo === "acceso_habilitado" ? (
                  <>
                    <p className="text-base font-semibold leading-snug text-texto">
                      {t("acceso_habilitado.titulo")}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-texto-tenue">
                      {t("acceso_habilitado.texto")}
                    </p>
                  </>
                ) : n.tipo === "espera_vencida" ? (
                  <p className="text-base leading-snug text-texto-tenue">
                    {t.rich("espera_vencida", { titulo: titulo(n), b: negrita })}
                  </p>
                ) : (
                  <p className="text-base leading-snug text-texto">
                    {t.rich("sala_creada", { titulo: titulo(n), b: negrita })}
                  </p>
                )}
                <p className="mt-0.5 text-2xs text-texto-tenue">
                  {new Date(n.creado_en).toLocaleString(locale === "en" ? "en-US" : "es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
