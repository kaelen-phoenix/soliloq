"use client";

import { useCallback, useEffect, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Metricas = Database["public"]["Functions"]["admin_metricas"]["Returns"][number];
type Usuario = Database["public"]["Functions"]["admin_usuarios"]["Returns"][number];
type Denuncia = Database["public"]["Functions"]["admin_denuncias"]["Returns"][number];
type Bloqueo = Database["public"]["Functions"]["admin_bloqueos"]["Returns"][number];
type Mensaje = Database["public"]["Functions"]["admin_mensajes"]["Returns"][number];
type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];

const PAGINA = 50;
type Pestana = "resumen" | "usuarios" | "denuncias" | "bloqueos" | "mensajes" | "sponsors";

function fecha(v: string | null) {
  return v ? new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
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

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1.5">
        {(["resumen", "usuarios", "denuncias", "bloqueos", "mensajes", "sponsors"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              pestana === p ? "bg-accion text-accion-texto" : "text-texto-tenue hover:bg-fondo-sutil"
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      {pestana === "resumen" && <Resumen metricas={metricas} />}
      {pestana === "usuarios" && (
        <Usuarios supabase={supabase} iniciales={usuariosIniciales} miId={miId} />
      )}
      {pestana === "denuncias" && <Denuncias supabase={supabase} />}
      {pestana === "bloqueos" && <Bloqueos supabase={supabase} />}
      {pestana === "mensajes" && <Mensajes supabase={supabase} />}
      {pestana === "sponsors" && <Sponsors supabase={supabase} />}
    </div>
  );
}

// --- Mensajes de contacto ---------------------------------------------------------------

function Mensajes({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [filas, setFilas] = useState<Mensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_mensajes", { p_limite: 200, p_offset: 0 });
    if (e) setError(e.message ?? "No se pudo leer.");
    else setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarLeido(m: Mensaje) {
    const { error: e } = await supabase.rpc("admin_marcar_mensaje_leido", {
      p_id: m.id,
      p_leido: !m.leido,
    });
    if (e) setError(e.message ?? "No se pudo aplicar.");
    else setFilas((prev) => (prev ?? []).map((f) => (f.id === m.id ? { ...f, leido: !m.leido } : f)));
  }

  if (error) return <p className="text-sm text-error-600">{error}</p>;
  if (filas === null) return <p className="text-sm text-texto-tenue">Cargando mensajes…</p>;
  if (filas.length === 0)
    return <EstadoVacio icono="campana" titulo="Sin mensajes" detalle="No hay mensajes de contacto." />;

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
              {m.leido ? "No leído" : "Leído"}
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
  const [filas, setFilas] = useState<Sponsor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormSponsor>(VACIO);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_sponsors");
    if (e) setError(e.message ?? "No se pudo leer.");
    else setFilas(data ?? []);
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
      setError(err.message ?? "No se pudo guardar.");
      return;
    }
    setError(null);
    setForm(VACIO);
    cargar();
  }

  async function borrar(s: Sponsor) {
    if (!window.confirm(`¿Borrar a ${s.nombre}?`)) return;
    const { error: e } = await supabase.rpc("admin_borrar_sponsor", { p_id: s.id });
    if (e) setError(e.message ?? "No se pudo borrar.");
    else setFilas((prev) => (prev ?? []).filter((f) => f.id !== s.id));
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
                  {!s.activo && <span className="ml-1.5 text-xs text-texto-tenue">(inactivo)</span>}
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  {s.nivel} · orden {s.orden}
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
                    nivel: s.nivel,
                    activo: s.activo,
                    orden: s.orden,
                  })
                }
                className="rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto-tenue hover:bg-fondo-sutil"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => borrar(s)}
                className="rounded-lg border border-error-400 px-2.5 py-1 text-xs font-medium text-error-600 hover:bg-error-50"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={guardar} className="rounded-2xl border border-dashed border-borde p-4">
        <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          {form.id ? "Editar sponsor" : "Nuevo sponsor"}
        </p>
        <div className="flex flex-col gap-2">
          <CampoTexto id="sp-nombre" etiqueta="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <CampoTexto id="sp-logo" etiqueta="URL del logo (PNG/SVG transparente)" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          <CampoTexto id="sp-sitio" etiqueta="URL del sitio (opcional)" value={form.sitio_url} onChange={(e) => setForm({ ...form, sitio_url: e.target.value })} />
          <div className="flex gap-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
              Nivel
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
            <CampoTexto id="sp-orden" etiqueta="Orden" type="number" value={String(form.orden)} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-texto">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              Activo
            </label>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Boton variante="secundario" type="submit">
            {form.id ? "Guardar" : "Agregar"}
          </Boton>
          {form.id && (
            <button type="button" onClick={() => setForm(VACIO)} className="text-xs text-texto-tenue underline underline-offset-4">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// --- Resumen -------------------------------------------------------------------------------

function Resumen({ metricas }: { metricas: Metricas | null }) {
  if (!metricas) return <EstadoVacio icono="admin" titulo="Sin datos" detalle="No se pudieron leer las métricas." />;
  const tarjetas: { etiqueta: string; valor: number }[] = [
    { etiqueta: "Usuarios", valor: metricas.total },
    { etiqueta: "Con perfil de talento", valor: metricas.con_talento },
    { etiqueta: "Con perfil de creador", valor: metricas.con_creador },
    { etiqueta: "Con ambos perfiles", valor: metricas.con_ambos },
    { etiqueta: "Altas últimos 7 días", valor: metricas.registros_7d },
    { etiqueta: "Enlace público activo", valor: metricas.con_enlace_publico },
    { etiqueta: "Suspendidos", valor: metricas.suspendidos },
    { etiqueta: "Bloqueos", valor: metricas.bloqueos },
    { etiqueta: "Denuncias abiertas", valor: metricas.denuncias_abiertas },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tarjetas.map((t) => (
        <li key={t.etiqueta} className="rounded-2xl border border-borde bg-superficie p-4">
          <p className="font-display text-2xl font-semibold text-texto">{t.valor}</p>
          <p className="mt-0.5 text-xs text-texto-tenue">{t.etiqueta}</p>
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
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<Usuario[]>(iniciales);
  const [offset, setOffset] = useState(iniciales.length);
  const [hayMas, setHayMas] = useState(iniciales.length === PAGINA);
  const [cargando, setCargando] = useState(false);
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
        setError("No se pudo buscar.");
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
          ? `¿Suspender a ${u.nombre ?? u.email}? No podrá entrar hasta reactivarla.`
          : `¿Reactivar a ${u.nombre ?? u.email}?`,
      )
    )
      return;
    const { error: e } = await supabase.rpc("admin_suspender_usuario", {
      p_id: u.id,
      p_suspender: suspender,
    });
    if (e) {
      setError(e.message ?? "No se pudo aplicar.");
      return;
    }
    setError(null);
    setFilas((prev) => prev.map((f) => (f.id === u.id ? { ...f, suspendido: suspender } : f)));
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
          etiqueta="Buscar"
          placeholder="Nombre o email"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="self-end">
          <Boton variante="secundario" type="submit" cargando={cargando} textoCargando="…">
            Buscar
          </Boton>
        </div>
      </form>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {filas.length === 0 ? (
        <EstadoVacio icono="perfil" titulo="Sin usuarios" detalle="No hay resultados para esa búsqueda." />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
          {filas.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-texto">
                  {u.nombre ?? "(sin nombre)"}
                  {u.es_admin && (
                    <span className="ml-1.5 rounded acento-fondo px-1.5 py-0.5 text-2xs font-semibold text-brand-600">
                      admin
                    </span>
                  )}
                  {u.suspendido && (
                    <span className="ml-1.5 rounded bg-error-50 px-1.5 py-0.5 text-2xs font-semibold text-error-600">
                      suspendido
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  {u.email} · {u.roles.join(" + ") || "sin perfil"} · alta {fecha(u.creado_en)}
                </p>
              </div>
              {u.id !== miId && !u.es_admin && (
                <button
                  type="button"
                  onClick={() => alternarSuspension(u)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    u.suspendido
                      ? "border-borde text-texto hover:bg-fondo-sutil"
                      : "border-error-400 text-error-600 hover:bg-error-50"
                  }`}
                >
                  {u.suspendido ? "Reactivar" : "Suspender"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hayMas && (
        <div className="flex justify-center">
          <Boton variante="secundario" cargando={cargando} textoCargando="Cargando…" onClick={() => buscar(offset, texto)}>
            Cargar más
          </Boton>
        </div>
      )}
    </div>
  );
}

// --- Denuncias ----------------------------------------------------------------------------

const ESTADOS_DENUNCIA = ["abierta", "en_revision", "resuelta", "descartada"] as const;

function Denuncias({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [filas, setFilas] = useState<Denuncia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_denuncias", { p_limite: 100, p_offset: 0 });
    if (e) {
      setError(e.message ?? "No se pudo leer.");
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
        ? window.prompt("Nota de resolución (opcional):") ?? undefined
        : undefined;
    const { error: e } = await supabase.rpc("admin_resolver_denuncia", {
      p_id: d.id,
      p_estado: estado,
      p_resolucion: resolucion,
    });
    if (e) {
      setError(e.message ?? "No se pudo aplicar.");
      return;
    }
    setError(null);
    setFilas((prev) => (prev ?? []).map((f) => (f.id === d.id ? { ...f, estado } : f)));
  }

  if (error) return <p className="text-sm text-error-600">{error}</p>;
  if (filas === null) return <p className="text-sm text-texto-tenue">Cargando denuncias…</p>;
  if (filas.length === 0)
    return <EstadoVacio icono="bandera" titulo="Sin denuncias" detalle="No hay denuncias registradas." />;

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
                <p className="mt-1 text-xs italic text-texto-tenue">Resolución: {d.resolucion}</p>
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
                {e.replace("_", " ")}
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
  const [filas, setFilas] = useState<Bloqueo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc("admin_bloqueos", { p_limite: 100, p_offset: 0 });
    if (e) {
      setError(e.message ?? "No se pudo leer.");
      return;
    }
    setFilas(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function levantar(b: Bloqueo) {
    if (!window.confirm(`¿Levantar el bloqueo entre ${b.nombre_menor ?? "?"} y ${b.nombre_mayor ?? "?"}?`)) return;
    const { error: e } = await supabase.rpc("admin_levantar_bloqueo", {
      p_menor: b.perfil_menor,
      p_mayor: b.perfil_mayor,
    });
    if (e) {
      setError(e.message ?? "No se pudo levantar.");
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
      setError(err.message ?? "No se pudo crear.");
      return;
    }
    setError(null);
    setAId("");
    setBId("");
    setMotivo("");
    setFilas(null);
  }

  if (filas === null && !error) return <p className="text-sm text-texto-tenue">Cargando bloqueos…</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-error-600">{error}</p>}

      {(filas ?? []).length === 0 ? (
        <EstadoVacio icono="perfil" titulo="Sin bloqueos" detalle="No hay bloqueos entre usuarios." />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-borde">
          {(filas ?? []).map((b) => (
            <li key={`${b.perfil_menor}-${b.perfil_mayor}`} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate text-texto">
                  {b.nombre_menor ?? b.perfil_menor.slice(0, 8)} ↔ {b.nombre_mayor ?? b.perfil_mayor.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-texto-tenue">
                  puso {b.nombre_autor ?? "?"} · {fecha(b.creado_en)}
                  {b.motivo ? ` · ${b.motivo}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => levantar(b)}
                className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-texto transition-colors hover:bg-fondo-sutil"
              >
                Levantar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={crear} className="rounded-2xl border border-dashed border-borde p-4">
        <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-texto-tenue">
          Imponer un bloqueo (por id de perfil)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CampoTexto id="bloq-a" etiqueta="Perfil A" placeholder="uuid" value={aId} onChange={(e) => setAId(e.target.value)} />
          <CampoTexto id="bloq-b" etiqueta="Perfil B" placeholder="uuid" value={bId} onChange={(e) => setBId(e.target.value)} />
        </div>
        <div className="mt-2">
          <CampoTexto id="bloq-motivo" etiqueta="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <div className="mt-3">
          <Boton variante="secundario" type="submit">
            Bloquear
          </Boton>
        </div>
      </form>
    </div>
  );
}
