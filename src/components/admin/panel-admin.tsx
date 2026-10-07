"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import {
  adminBorrarUsuario,
  adminEnviarBienvenidas,
  adminMandarInvitacion,
  adminEnviarmePruebaBienvenida,
  adminEstadoBienvenidas,
  type EstadoBienvenida,
} from "@/app/(sitio)/(app)/admin/acciones";
import { despacharAvisosDeAcceso } from "@/app/acciones-push";
import { ConfirmarBorrado } from "@/components/ui/confirmar-borrado";
import type { Database } from "@/lib/supabase/types";
import { RevisionIa } from "./revision-ia";

type Metricas = Database["public"]["Functions"]["admin_metricas"]["Returns"][number];
type Usuario = Database["public"]["Functions"]["admin_usuarios"]["Returns"][number];
type Denuncia = Database["public"]["Functions"]["admin_denuncias"]["Returns"][number];
type Bloqueo = Database["public"]["Functions"]["admin_bloqueos"]["Returns"][number];
type Mensaje = Database["public"]["Functions"]["admin_mensajes"]["Returns"][number];
type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
type Publicacion = Database["public"]["Functions"]["admin_publicaciones"]["Returns"][number];
type Solicitud = Database["public"]["Functions"]["admin_solicitudes_pendientes"]["Returns"][number];
type Invitacion = Database["public"]["Functions"]["admin_invitaciones"]["Returns"][number];

const PAGINA = 50;
type Pestana =
  | "resumen"
  | "usuarios"
  | "acceso"
  | "publicaciones"
  | "denuncias"
  | "bloqueos"
  | "mensajes"
  | "sponsors"
  | "revisión";

/** Fecha corta en el idioma activo. */
function useFecha() {
  const idioma = useLocale() === "en" ? "en-US" : "es-AR";
  return (v: string | null) =>
    v ? new Date(v).toLocaleDateString(idioma, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

/** El enlace para ver un perfil "como en la app": el booking público si está activo, si no
 *  la ficha interna del Perfil de Talento (única identidad desde #175). */
function hrefPerfil(u: Usuario): string {
  if (u.enlace_publico_activo && u.enlace_token) return `/p/${u.enlace_token}`;
  return `/talentos/${u.id}`;
}

function VerEnApp({ href }: { href: string }) {
  const t = useTranslations("admin.panel");
  return (
    <Link
      href={href}
      target="_blank"
      className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-tenue transition-colors hover:bg-fondo-sutil"
    >
      {t("ver")}
    </Link>
  );
}

export function PanelAdmin({
  metricas,
  usuariosIniciales,
  miId,
}: {
  metricas: Metricas | null;
  usuariosIniciales: Usuario[];
  miId: string;
}) {
  const supabase = createClient();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const t = useTranslations("admin.panel.pestanas");

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1.5">
        {(
          ["resumen", "usuarios", "acceso", "publicaciones", "denuncias", "revisión", "bloqueos", "mensajes", "sponsors"] as const
        ).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              pestana === p ? "bg-accion text-accion-texto" : "text-texto-tenue hover:bg-fondo-sutil"
            }`}
          >
            {t(p === "revisión" ? "revision" : p)}
          </button>
        ))}
      </nav>

      {pestana === "resumen" && <Resumen metricas={metricas} />}
      {pestana === "usuarios" && (
        <Usuarios supabase={supabase} iniciales={usuariosIniciales} miId={miId} />
      )}
      {pestana === "acceso" && <Acceso supabase={supabase} />}
      {pestana === "publicaciones" && <Publicaciones supabase={supabase} />}
      {pestana === "denuncias" && <Denuncias supabase={supabase} />}
      {pestana === "bloqueos" && <Bloqueos supabase={supabase} />}
      {pestana === "mensajes" && <Mensajes supabase={supabase} />}
      {pestana === "sponsors" && <Sponsors supabase={supabase} />}
      {pestana === "revisión" && <RevisionIa />}
    </div>
  );
}

// --- Mensajes de contacto ---------------------------------------------------------------

function Mensajes({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const fecha = useFecha();
  const [filas, setFilas] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_mensajes", { p_limite: 200, p_offset: 0 });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_mensajes" });
      setError(t("comun.noSeLeyo"));
    } else setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarLeido(m: Mensaje) {
    const { error: e } = await supabase.rpc("admin_marcar_mensaje_leido", {
      p_id: m.id,
      p_leido: !m.leido,
    });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_marcar_mensaje_leido", mensajeId: m.id });
      setError(t("comun.noSeAplico"));
    } else setFilas((prev) => (prev ?? []).map((f) => (f.id === m.id ? { ...f, leido: !m.leido } : f)));
  }

  if (error) return <p className="text-sm text-error-600">{error}</p>;
  if (filas === null) return <p className="text-sm text-texto-tenue">{t("mensajes.cargando")}</p>;
  if (filas.length === 0)
    return <EstadoVacio icono="campana" titulo={t("mensajes.vacioTitulo")} detalle={t("mensajes.vacioDetalle")} />;

  return (
    <ul className="flex flex-col gap-3">
      {filas.map((m) => (
        <li
          key={m.id}
          className={`rounded-2xl border p-4 ${m.leido ? "border-borde bg-superficie" : "border-brand-200 acento-fondo"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-texto">
                {m.nombre} · <span className="text-texto-tenue">{m.tipo}</span>
              </p>
              <p className="truncate text-xs text-texto-tenue">
                <a href={`mailto:${m.email}`} className="underline underline-offset-2">
                  {m.email}
                </a>{" "}
                · {fecha(m.creado_en)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-texto">{m.mensaje}</p>
            </div>
            <button
              type="button"
              onClick={() => alternarLeido(m)}
              className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-tenue transition-colors hover:bg-fondo-sutil"
            >
              {m.leido ? t("mensajes.noLeido") : t("mensajes.leido")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Sponsors -------------------------------------------------------------------------------

const NIVELES_SPONSOR = ["reparto", "coproduccion", "produccion"] as const;
type FormSponsor = {
  id: string | null;
  nombre: string;
  logo_url: string;
  sitio_url: string;
  nivel: (typeof NIVELES_SPONSOR)[number];
  activo: boolean;
  orden: number;
};

const VACIO: FormSponsor = {
  id: null,
  nombre: "",
  logo_url: "",
  sitio_url: "",
  nivel: "reparto",
  activo: true,
  orden: 0,
};

function Sponsors({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const [filas, setFilas] = useState<Sponsor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormSponsor>(VACIO);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_sponsors");
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_sponsors" });
      setError(t("comun.noSeLeyo"));
    } else setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase.rpc("admin_guardar_sponsor", {
      p_id: form.id,
      p_nombre: form.nombre.trim(),
      p_logo_url: form.logo_url.trim(),
      p_sitio_url: form.sitio_url.trim() || null,
      p_nivel: form.nivel,
      p_activo: form.activo,
      p_orden: Number(form.orden) || 0,
    });
    if (err) {
      reportarErrorSupabase(err, { rpc: "admin_guardar_sponsor", sponsorId: form.id });
      setError(t("comun.noSeGuardo"));
      return;
    }
    setError(null);
    setForm(VACIO);
    cargar();
  }

  async function borrar(s: Sponsor) {
    if (!window.confirm(t("sponsors.confirmarBorrar", { nombre: s.nombre }))) return;
    const { error: e } = await supabase.rpc("admin_borrar_sponsor", { p_id: s.id });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_borrar_sponsor", sponsorId: s.id });
      setError(t("comun.noSeBorro"));
    } else setFilas((prev) => (prev ?? []).filter((f) => f.id !== s.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-error-600">{error}</p>}

      {(filas ?? []).length > 0 && (
        <ul className="flex flex-col divide-y divide-borde rounded-2xl border border-borde">
          {(filas ?? []).map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logo_url} alt={s.nombre} className="h-8 w-14 shrink-0 object-contain" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate text-texto">
                  {s.nombre}
                  {!s.activo && <span className="ml-1.5 text-xs text-texto-tenue">{t("sponsors.inactivo")}</span>}
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  {t("sponsors.nivelOrden", { nivel: s.nivel, orden: s.orden })}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    id: s.id,
                    nombre: s.nombre,
                    logo_url: s.logo_url,
                    sitio_url: s.sitio_url ?? "",
                    nivel: s.nivel as FormSponsor["nivel"],
                    activo: s.activo,
                    orden: s.orden,
                  })
                }
                className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-tenue hover:bg-fondo-sutil"
              >
                {t("comun.editar")}
              </button>
              <button
                type="button"
                onClick={() => borrar(s)}
                className="rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 hover:bg-error-50"
              >
                {t("comun.borrar")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={guardar} className="rounded-2xl border border-dashed border-borde p-4">
        <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {form.id ? t("sponsors.editarTitulo") : t("sponsors.nuevoTitulo")}
        </p>
        <div className="flex flex-col gap-2">
          <CampoTexto id="sp-nombre" etiqueta={t("sponsors.nombre")} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <CampoTexto id="sp-logo" etiqueta={t("sponsors.logo")} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          <CampoTexto id="sp-sitio" etiqueta={t("sponsors.sitio")} value={form.sitio_url} onChange={(e) => setForm({ ...form, sitio_url: e.target.value })} />
          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
              {t("sponsors.nivel")}
              <select
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value as FormSponsor["nivel"] })}
                className="rounded-xl border border-borde bg-superficie px-3 py-2 text-sm text-texto"
              >
                {NIVELES_SPONSOR.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <CampoTexto id="sp-orden" etiqueta={t("sponsors.orden")} type="number" value={String(form.orden)} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-texto">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              {t("sponsors.activo")}
            </label>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Boton variante="secundario" type="submit">
            {form.id ? t("sponsors.guardar") : t("sponsors.agregar")}
          </Boton>
          {form.id && (
            <button type="button" onClick={() => setForm(VACIO)} className="text-xs text-texto-tenue underline underline-offset-4">
              {t("comun.cancelar")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// --- Resumen -------------------------------------------------------------------------------

function Resumen({ metricas }: { metricas: Metricas | null }) {
  const t = useTranslations("admin.panel.resumen");
  if (!metricas) return <EstadoVacio icono="admin" titulo={t("vacioTitulo")} detalle={t("vacioDetalle")} />;
  const tarjetas: { etiqueta: string; valor: number }[] = [
    { etiqueta: t("total"), valor: metricas.total },
    { etiqueta: t("con_talento"), valor: metricas.con_talento },
    { etiqueta: t("con_creador"), valor: metricas.con_creador },
    { etiqueta: t("con_ambos"), valor: metricas.con_ambos },
    { etiqueta: t("registros_7d"), valor: metricas.registros_7d },
    { etiqueta: t("con_enlace_publico"), valor: metricas.con_enlace_publico },
    { etiqueta: t("suspendidos"), valor: metricas.suspendidos },
    { etiqueta: t("bloqueos"), valor: metricas.bloqueos },
    { etiqueta: t("denuncias_abiertas"), valor: metricas.denuncias_abiertas },
    { etiqueta: t("obras_publicadas"), valor: metricas.obras_publicadas },
    { etiqueta: t("equipos_activos"), valor: metricas.equipos_activos },
    { etiqueta: t("matches_activos"), valor: metricas.matches_activos },
    { etiqueta: t("convocatorias_aceptadas"), valor: metricas.convocatorias_aceptadas },
    { etiqueta: t("salas"), valor: metricas.salas },
    { etiqueta: t("interes_7d"), valor: metricas.interes_7d },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tarjetas.map((tarjeta) => (
        <li key={tarjeta.etiqueta} className="rounded-2xl border border-borde bg-superficie p-4">
          <p className="font-display text-2xl font-semibold text-texto">{tarjeta.valor}</p>
          <p className="mt-0.5 text-xs text-texto-tenue">{tarjeta.etiqueta}</p>
        </li>
      ))}
    </ul>
  );
}

// --- Usuarios ------------------------------------------------------------------------------

function Usuarios({
  supabase,
  iniciales,
  miId,
}: {
  supabase: ReturnType<typeof createClient>;
  iniciales: Usuario[];
  miId: string;
}) {
  const t = useTranslations("admin.panel");
  const tComun = useTranslations("comun");
  const fecha = useFecha();
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<Usuario[]>(iniciales);
  const [offset, setOffset] = useState(iniciales.length);
  const [hayMas, setHayMas] = useState(iniciales.length === PAGINA);
  const [cargando, setCargando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(
    async (nuevoOffset: number, q: string) => {
      setCargando(true);
      const { data, error: e } = await supabase.rpc("admin_usuarios", {
        p_texto: q.trim() || null,
        p_limite: PAGINA,
        p_offset: nuevoOffset,
      });
      setCargando(false);
      if (e) {
        reportarErrorSupabase(e, { rpc: "admin_usuarios", texto: q });
        setError(t("usuarios.noSeBusco"));
        return;
      }
      const nuevas = data ?? [];
      setFilas((prev) => (nuevoOffset === 0 ? nuevas : [...prev, ...nuevas]));
      setOffset(nuevoOffset + nuevas.length);
      setHayMas(nuevas.length === PAGINA);
    },
    [supabase],
  );

  async function alternarSuspension(u: Usuario) {
    const suspender = !u.suspendido;
    if (
      !window.confirm(
        suspender
          ? t("usuarios.confirmarSuspender", { nombre: u.nombre ?? u.email })
          : t("usuarios.confirmarReactivar", { nombre: u.nombre ?? u.email }),
      )
    )
      return;
    const { error: e } = await supabase.rpc("admin_suspender_usuario", {
      p_id: u.id,
      p_suspender: suspender,
    });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_suspender_usuario", usuarioId: u.id });
      // Los dos rechazos que pone la base a propósito (0040) se muestran con su motivo.
      setError(
        e.message.includes("a vos mismo")
          ? t("usuarios.noATiMismo")
          : e.message.includes("otro admin")
            ? t("usuarios.noAOtroAdmin")
            : t("comun.noSeAplico"),
      );
      return;
    }
    setError(null);
    setFilas((prev) => prev.map((f) => (f.id === u.id ? { ...f, suspendido: suspender } : f)));
  }

  async function borrar(u: Usuario) {
    setBorrandoId(u.id);
    // Si la acción tira (red, servidor), también hay que salir de «Borrando…» (#229).
    const res = await adminBorrarUsuario(u.id).catch(() => ({
      ok: false as const,
      error: t("usuarios.noSeBorroReintentar"),
    }));
    setBorrandoId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setConfirmandoId(null);
    setFilas((prev) => prev.filter((f) => f.id !== u.id));
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar(0, texto);
        }}
        className="flex gap-2"
      >
        <CampoTexto
          id="admin-buscar-usuario"
          etiqueta={t("comun.buscar")}
          placeholder={t("usuarios.placeholder")}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="self-end">
          <Boton variante="secundario" type="submit" cargando={cargando} textoCargando="…">
            {t("comun.buscar")}
          </Boton>
        </div>
      </form>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {filas.length === 0 ? (
        <EstadoVacio icono="perfil" titulo={t("usuarios.vacioTitulo")} detalle={t("usuarios.vacioDetalle")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
          {filas.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 p-3.5">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">
                    {u.nombre ?? t("comun.sinNombre")}
                    {u.es_admin && (
                      <span className="ml-1.5 rounded acento-fondo px-1.5 py-0.5 text-2xs font-semibold text-brand-600">
                        {t("usuarios.admin")}
                      </span>
                    )}
                    {u.suspendido && (
                      <span className="ml-1.5 rounded bg-error-50 px-1.5 py-0.5 text-2xs font-semibold text-error-600">
                        {t("usuarios.suspendido")}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-texto-tenue">
                    {t("usuarios.detalle", {
                      email: u.email,
                      roles: u.roles.join(" + ") || t("usuarios.sinPerfil"),
                      fecha: fecha(u.creado_en),
                    })}
                  </p>
                </div>
                <VerEnApp href={hrefPerfil(u)} />
                {u.id !== miId && !u.es_admin && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => alternarSuspension(u)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        u.suspendido
                          ? "border-borde text-texto hover:bg-fondo-sutil"
                          : "border-error-400 text-error-600 hover:bg-error-50"
                      }`}
                    >
                      {u.suspendido ? t("usuarios.reactivar") : t("usuarios.suspender")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(u.id)}
                      className="rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50"
                    >
                      {t("comun.borrar")}
                    </button>
                  </div>
                )}
              </div>
              {confirmandoId === u.id && (
                <ConfirmarBorrado
                  mensaje={t("usuarios.confirmarBorrado", {
                    nombre: u.nombre ?? u.email,
                    palabra: t("usuarios.palabraBorrar"),
                  })}
                  palabra={t("usuarios.palabraBorrar")}
                  textoBoton={t("usuarios.borrarDefinitivamente")}
                  textoCargando={t("usuarios.borrando")}
                  textoCancelar={tComun("cancelar")}
                  cargando={borrandoId === u.id}
                  onConfirmar={() => borrar(u)}
                  onCancelar={() => setConfirmandoId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {hayMas && (
        <div className="flex justify-center">
          <Boton variante="secundario" cargando={cargando} textoCargando={t("comun.cargando")} onClick={() => buscar(offset, texto)}>
            {t("comun.cargarMas")}
          </Boton>
        </div>
      )}
    </div>
  );
}

// --- Acceso (invitaciones + solicitudes pendientes) ---------------------------------------
//
// Mientras Yalope está en prueba, nadie entra sin invitación o aprobación manual (issue
// relacionado a la etapa de preview). Una cuenta invitada de antemano queda aprobada sola
// al registrarse; sin invitación, queda pendiente y sólo aparece por email (todavía no pudo
// completar su Perfil de Talento).

function Acceso({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const fecha = useFecha();
  const [email, setEmail] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [pendientes, setPendientes] = useState<Solicitud[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[] | null>(null);
  const [aprobandoId, setAprobandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: sol, error: eSol }, { data: inv, error: eInv }] = await Promise.all([
      supabase.rpc("admin_solicitudes_pendientes"),
      supabase.rpc("admin_invitaciones"),
    ]);
    if (eSol || eInv) {
      if (eSol) reportarErrorSupabase(eSol, { rpc: "admin_solicitudes_pendientes" });
      if (eInv) reportarErrorSupabase(eInv, { rpc: "admin_invitaciones" });
      setError(t("comun.noSeLeyo"));
      return;
    }
    setPendientes(sol ?? []);
    setInvitaciones(inv ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setInvitando(true);
    setError(null);
    setAviso(null);
    const { error: err } = await supabase.rpc("admin_crear_invitacion", { p_email: email.trim() });
    setInvitando(false);
    if (err) {
      reportarErrorSupabase(err, { rpc: "admin_crear_invitacion" });
      setError(err.message.includes("email inválido") ? t("acceso.emailInvalido") : t("acceso.noSeInvito"));
      return;
    }
    const invitado = email.trim();
    const mail = await adminMandarInvitacion(invitado);
    setAviso(
      mail.ok && mail.enviado
        ? t("acceso.invitacionEnviada", { email: invitado })
        : mail.ok
          ? t("acceso.invitacionRegistrada", { email: invitado })
          : t("acceso.invitacionSinMail", { email: invitado, error: mail.error }),
    );
    setEmail("");
    cargar();
    // Si ese email ya estaba esperando, la invitación lo habilitó: sale su push (#247).
    void despacharAvisosDeAcceso();
  }

  async function aprobar(s: Solicitud) {
    setAprobandoId(s.id);
    const { error: err } = await supabase.rpc("admin_aprobar_usuario", { p_id: s.id });
    setAprobandoId(null);
    if (err) {
      reportarErrorSupabase(err, { rpc: "admin_aprobar_usuario", solicitudId: s.id });
      setError(t("acceso.noSeAprobo"));
      return;
    }
    setError(null);
    setPendientes((prev) => (prev ?? []).filter((p) => p.id !== s.id));
    // La base ya le dejó el aviso en la campanita (0092); acá sale el push (#247).
    void despacharAvisosDeAcceso();
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-xs text-error-600">{error}</p>}
      {aviso && <p className="text-xs text-brand-600">{aviso}</p>}

      <form onSubmit={invitar} className="rounded-2xl border border-dashed border-borde p-4">
        <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("acceso.invitarTitulo")}
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <CampoTexto
              id="acceso-email"
              etiqueta={t("acceso.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="self-end">
            <Boton type="submit" cargando={invitando} textoCargando="…">
              {t("acceso.invitar")}
            </Boton>
          </div>
        </div>
        <p className="mt-2 text-xs text-texto-tenue">
          {t("acceso.invitarAyuda")}
        </p>
      </form>

      <MailBienvenida />

      <div>
        <h3 className="mb-2 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("acceso.pendientesTitulo")}
        </h3>
        {pendientes === null ? (
          <p className="text-sm text-texto-tenue">{t("comun.cargando")}</p>
        ) : pendientes.length === 0 ? (
          <EstadoVacio icono="perfil" titulo={t("acceso.pendientesVacioTitulo")} detalle={t("acceso.pendientesVacioDetalle")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
            {pendientes.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{s.email}</p>
                  <p className="text-xs text-texto-tenue">{t("acceso.seRegistro", { fecha: fecha(s.creado_en) })}</p>
                </div>
                <button
                  type="button"
                  onClick={() => aprobar(s)}
                  disabled={aprobandoId === s.id}
                  className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
                >
                  {aprobandoId === s.id ? "…" : t("acceso.habilitar")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("acceso.invitacionesTitulo")}
        </h3>
        {invitaciones === null ? (
          <p className="text-sm text-texto-tenue">{t("comun.cargando")}</p>
        ) : invitaciones.length === 0 ? (
          <EstadoVacio icono="perfil" titulo={t("acceso.invitacionesVacioTitulo")} detalle={t("acceso.invitacionesVacioDetalle")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
            {invitaciones.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{i.email}</p>
                  <p className="text-xs text-texto-tenue">{t("acceso.enviadaEl", { fecha: fecha(i.creado_en) })}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                    i.usado_en ? "acento-fondo text-brand-600" : "bg-fondo-sutil text-texto-tenue"
                  }`}
                >
                  {i.usado_en ? t("acceso.usada") : t("acceso.pendiente")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- Publicaciones ----------------------------------------------------------------------

const COLOR_PUB: Record<string, string> = {
  publicada: "bg-accion text-accion-texto",
  borrador: "bg-ink-100 text-texto-tenue",
  cerrada: "bg-fondo-sutil text-texto-tenue",
  activo: "bg-accion text-accion-texto",
  cerrado: "bg-fondo-sutil text-texto-tenue",
};

function Publicaciones({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const fecha = useFecha();
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<Publicacion[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (nuevoOffset: number, q: string) => {
      setCargando(true);
      const { data, error: e } = await supabase.rpc("admin_publicaciones", {
        p_texto: q.trim() || null,
        p_limite: PAGINA,
        p_offset: nuevoOffset,
      });
      setCargando(false);
      if (e) {
        reportarErrorSupabase(e, { rpc: "admin_publicaciones", texto: q });
        setError(t("comun.noSeLeyo"));
        return;
      }
      setError(null);
      const nuevas = data ?? [];
      setFilas((prev) => (nuevoOffset === 0 || prev === null ? nuevas : [...prev, ...nuevas]));
      setOffset(nuevoOffset + nuevas.length);
      setHayMas(nuevas.length === PAGINA);
    },
    [supabase],
  );

  useEffect(() => {
    cargar(0, "");
  }, [cargar]);

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar(0, texto);
        }}
        className="flex gap-2"
      >
        <CampoTexto
          id="admin-buscar-pub"
          etiqueta={t("comun.buscar")}
          placeholder={t("publicaciones.placeholder")}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="self-end">
          <Boton variante="secundario" type="submit" cargando={cargando} textoCargando="…">
            {t("comun.buscar")}
          </Boton>
        </div>
      </form>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {filas === null ? (
        <p className="text-sm text-texto-tenue">{t("publicaciones.cargando")}</p>
      ) : filas.length === 0 ? (
        <EstadoVacio icono="tablero" titulo={t("publicaciones.vacioTitulo")} detalle={t("publicaciones.vacioDetalle")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
          {filas.map((p) => (
            <li key={`${p.tipo}-${p.id}`} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-texto">
                  <span className="mr-1.5 rounded bg-fondo-sutil px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-texto-tenue">
                    {p.tipo}
                  </span>
                  {p.titulo}
                  <span
                    className={`ml-1.5 rounded px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                      COLOR_PUB[p.estado] ?? "bg-fondo-sutil text-texto-tenue"
                    }`}
                  >
                    {p.estado}
                  </span>
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  {p.creador_nombre ?? t("comun.sinNombre")} · {p.creador_email} · {p.detalle} ·{" "}
                  {t("publicaciones.fotos", { n: p.fotos })} · {fecha(p.creado_en)}
                </p>
              </div>
              <VerEnApp
                href={p.tipo === "obra" ? `/obras/${p.id}` : `/talentos/${p.creador_id}`}
              />
            </li>
          ))}
        </ul>
      )}

      {hayMas && (
        <div className="flex justify-center">
          <Boton
            variante="secundario"
            cargando={cargando}
            textoCargando={t("comun.cargando")}
            onClick={() => cargar(offset, texto)}
          >
            {t("comun.cargarMas")}
          </Boton>
        </div>
      )}
    </div>
  );
}

// --- Denuncias ----------------------------------------------------------------------------

const ESTADOS_DENUNCIA = ["abierta", "en_revision", "resuelta", "descartada"] as const;

function Denuncias({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const fecha = useFecha();
  const [filas, setFilas] = useState<Denuncia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_denuncias", { p_limite: 100, p_offset: 0 });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_denuncias" });
      setError(t("comun.noSeLeyo"));
      return;
    }
    setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function resolver(d: Denuncia, estado: string) {
    const resolucion =
      estado === "resuelta" || estado === "descartada"
        ? window.prompt(t("denuncias.notaResolucion")) ?? undefined
        : undefined;
    const { error: e } = await supabase.rpc("admin_resolver_denuncia", {
      p_id: d.id,
      p_estado: estado,
      p_resolucion: resolucion,
    });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_resolver_denuncia", denunciaId: d.id, estado });
      setError(t("comun.noSeAplico"));
      return;
    }
    setError(null);
    setFilas((prev) => (prev ?? []).map((f) => (f.id === d.id ? { ...f, estado } : f)));
  }

  if (error) return <p className="text-sm text-error-600">{error}</p>;
  if (filas === null) return <p className="text-sm text-texto-tenue">{t("denuncias.cargando")}</p>;
  if (filas.length === 0)
    return <EstadoVacio icono="bandera" titulo={t("denuncias.vacioTitulo")} detalle={t("denuncias.vacioDetalle")} />;

  return (
    <ul className="flex flex-col gap-3">
      {(filas ?? []).map((d) => (
        <li key={d.id} className="rounded-2xl border border-borde bg-superficie p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-texto">
                {d.motivo} · <span className="text-texto-tenue">{d.estado}</span>
              </p>
              <p className="mt-0.5 text-xs text-texto-tenue">
                {d.denunciante ?? "?"} → {d.denunciado ?? d.obra_titulo ?? "?"} · {fecha(d.creado_en)}
              </p>
              {d.detalle && <p className="mt-2 text-sm leading-relaxed text-texto">{d.detalle}</p>}
              {d.resolucion && (
                <p className="mt-1 text-xs italic text-texto-tenue">{t("denuncias.resolucion", { texto: d.resolucion })}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ESTADOS_DENUNCIA.filter((e) => e !== d.estado).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => resolver(d, e)}
                className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-tenue transition-colors hover:bg-fondo-sutil"
              >
                {t(`denuncias.estados.${e}`)}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Bloqueos -----------------------------------------------------------------------------

function Bloqueos({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const t = useTranslations("admin.panel");
  const fecha = useFecha();
  const [filas, setFilas] = useState<Bloqueo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_bloqueos", { p_limite: 100, p_offset: 0 });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_bloqueos" });
      setError(t("comun.noSeLeyo"));
      return;
    }
    setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function levantar(b: Bloqueo) {
    if (!window.confirm(t("bloqueos.confirmarLevantar", { a: b.nombre_menor ?? "?", b: b.nombre_mayor ?? "?" }))) return;
    const { error: e } = await supabase.rpc("admin_levantar_bloqueo", {
      p_menor: b.perfil_menor,
      p_mayor: b.perfil_mayor,
    });
    if (e) {
      reportarErrorSupabase(e, { rpc: "admin_levantar_bloqueo" });
      setError(t("bloqueos.noSeLevanto"));
      return;
    }
    setError(null);
    setFilas((prev) => (prev ?? []).filter((f) => f !== b));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase.rpc("admin_crear_bloqueo", {
      p_a: aId.trim(),
      p_b: bId.trim(),
      p_motivo: motivo.trim() || null,
    });
    if (err) {
      reportarErrorSupabase(err, { rpc: "admin_crear_bloqueo" });
      setError(t("bloqueos.noSeCreo"));
      return;
    }
    setError(null);
    setAId("");
    setBId("");
    setMotivo("");
    setFilas(null);
  }

  if (filas === null && !error) return <p className="text-sm text-texto-tenue">{t("bloqueos.cargando")}</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-error-600">{error}</p>}

      {(filas ?? []).length === 0 ? (
        <EstadoVacio icono="perfil" titulo={t("bloqueos.vacioTitulo")} detalle={t("bloqueos.vacioDetalle")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
          {(filas ?? []).map((b) => (
            <li key={`${b.perfil_menor}-${b.perfil_mayor}`} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate text-texto">
                  {b.nombre_menor ?? b.perfil_menor.slice(0, 8)} ↔ {b.nombre_mayor ?? b.perfil_mayor.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  {t("bloqueos.puso", { autor: b.nombre_autor ?? "?" })} · {fecha(b.creado_en)}
                  {b.motivo ? ` · ${b.motivo}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => levantar(b)}
                className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto transition-colors hover:bg-fondo-sutil"
              >
                {t("bloqueos.levantar")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={crear} className="rounded-2xl border border-dashed border-borde p-4">
        <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {t("bloqueos.imponerTitulo")}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CampoTexto id="bloq-a" etiqueta={t("bloqueos.perfilA")} placeholder="uuid" value={aId} onChange={(e) => setAId(e.target.value)} />
          <CampoTexto id="bloq-b" etiqueta={t("bloqueos.perfilB")} placeholder="uuid" value={bId} onChange={(e) => setBId(e.target.value)} />
        </div>
        <div className="mt-2">
          <CampoTexto id="bloq-motivo" etiqueta={t("bloqueos.motivo")} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <div className="mt-3">
          <Boton variante="secundario" type="submit">
            {t("bloqueos.bloquear")}
          </Boton>
        </div>
      </form>
    </div>
  );
}

/**
 * Mail de bienvenida (#272). A cada persona nueva le sale solo al aceptar las Normas. Acá:
 * una prueba al propio admin, el estado de quién ya lo recibió, y el envío a quienes falten
 * (la primera vez, a todos los usuarios). Cada cuenta lo recibe una sola vez.
 */
function MailBienvenida() {
  const t = useTranslations("admin.panel.bienvenida");
  const idioma = useLocale() === "en" ? "en-US" : "es-AR";
  const [cuentas, setCuentas] = useState<EstadoBienvenida[] | null>(null);
  const [accion, setAccion] = useState<"prueba" | "envio" | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [verLista, setVerLista] = useState(false);

  const cargarEstado = useCallback(async () => {
    const r = await adminEstadoBienvenidas();
    if (r.ok) setCuentas(r.cuentas);
    else setMensaje(r.error);
  }, []);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  const faltan = cuentas?.filter((c) => !c.enviadaEn).length ?? 0;

  async function prueba() {
    setAccion("prueba");
    setMensaje(null);
    const r = await adminEnviarmePruebaBienvenida();
    setAccion(null);
    setMensaje(r.ok ? t("pruebaOk", { email: r.para }) : r.error);
  }

  async function enviar() {
    if (!window.confirm(t("confirmarEnvio", { n: faltan }))) return;
    setAccion("envio");
    setMensaje(null);
    const r = await adminEnviarBienvenidas();
    setAccion(null);
    if (!r.ok) {
      setMensaje(r.error);
      return;
    }
    const { enviados, fallidos, sinCorreo } = r.resumen;
    setMensaje(
      sinCorreo
        ? t("sinCorreo")
        : fallidos
          ? t("enviadosConFallidos", { enviados, fallidos })
          : t("enviados", { enviados }),
    );
    cargarEstado();
  }

  return (
    <div className="rounded-2xl border border-borde p-4">
      <h3 className="text-sm font-medium text-texto">{t("titulo")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-texto-tenue">
        {t("explicacion")}
      </p>
      {cuentas && (
        <p className="mt-2 text-sm text-texto">
          {t("recibieron", { n: cuentas.length - faltan, total: cuentas.length })}{" "}
          <button
            type="button"
            onClick={() => setVerLista((v) => !v)}
            className="text-xs font-medium text-texto-tenue underline hover:text-texto"
          >
            {verLista ? t("ocultarDetalle") : t("verDetalle")}
          </button>
        </p>
      )}
      {verLista && cuentas && (
        <ul className="mt-2 flex max-h-64 flex-col divide-y divide-ink-100 overflow-y-auto rounded-xl border border-borde">
          {cuentas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="truncate text-texto">{c.email}</span>
              <span className={c.enviadaEn ? "shrink-0 text-exito-600" : "shrink-0 text-texto-tenue"}>
                {c.enviadaEn ? `✓ ${new Date(c.enviadaEn).toLocaleDateString(idioma)}` : t("pendiente")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton variante="secundario" onClick={prueba} cargando={accion === "prueba"} textoCargando={t("enviando")}>
          {t("enviarmePrueba")}
        </Boton>
        <Boton
          onClick={enviar}
          cargando={accion === "envio"}
          textoCargando={t("enviando")}
          disabled={!cuentas || faltan === 0 || accion !== null}
        >
          {faltan === 0 && cuentas ? t("todosRecibieron") : t("enviarFaltan", { n: faltan })}
        </Boton>
      </div>
      {mensaje && <p className="mt-2 text-xs text-texto-tenue">{mensaje}</p>}
    </div>
  );
}
