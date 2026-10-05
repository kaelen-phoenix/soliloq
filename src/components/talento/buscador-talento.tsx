"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Icono } from "@/components/ui/icono";
import { GENEROS_BUSCABLES, HABILIDADES, claveGenero, etiquetaHabilidad, type Genero } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { opcionesDeRadio, RADIO_INICIAL_METROS, SesionUbicacion, type Ubicacion } from "@/lib/ubicacion";
import { interpretarBusqueda } from "@/app/acciones-ia";
import { type ResultadoTalento } from "./tarjeta-talento";
import { PilaTalentos, type IniciativaPlaca } from "./pila-talentos";

const PAGINA = 24;

type Fila = Omit<ResultadoTalento, "fotoUrl"> & { foto_principal_path: string };

export function BuscadorTalento({ iniciativa }: { iniciativa: IniciativaPlaca | null }) {
  const supabase = createClient();
  const t = useTranslations("proyectos.buscador");
  const tc = useTranslations("comun");
  const tEtiquetas = useTranslations("perfil.etiquetas");

  const [texto, setTexto] = useState("");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [radioMetros, setRadioMetros] = useState<number | null>(RADIO_INICIAL_METROS);

  const [verFiltros, setVerFiltros] = useState(false);

  // #321: «Describí a quién buscás» → los mismos filtros de abajo, a la vista para corregirlos.
  const [consulta, setConsulta] = useState("");
  const [interpretando, setInterpretando] = useState(false);
  const [avisoConsulta, setAvisoConsulta] = useState<string | null>(null);

  async function aplicarConsulta(e: React.FormEvent) {
    e.preventDefault();
    if (interpretando || consulta.trim().length < 3) return;
    setInterpretando(true);
    setAvisoConsulta(null);
    try {
      const r = await interpretarBusqueda(consulta);
      if (!r.ok) return setAvisoConsulta(r.error);
      const f = r.filtros;
      setEdadMin(f.edadMin ? String(f.edadMin) : "");
      setEdadMax(f.edadMax ? String(f.edadMax) : "");
      setGeneros((f.generos ?? []) as Genero[]);
      setHabilidades(f.habilidades ?? []);
      setTexto(f.texto ?? "");
      let zona: string | null = null;
      // La zona anterior no puede quedar aplicada si la nueva no se encuentra.
      setUbicacion(null);
      if (f.zona) {
        try {
          const sesion = new SesionUbicacion();
          const [primera] = await sesion.buscar(f.zona);
          if (primera) {
            setUbicacion(await sesion.resolver(primera.id));
            zona = primera.texto;
          }
        } catch {
          // Sin zona: el resto de los filtros se aplica igual.
        }
      }
      setVerFiltros(true);
      setAvisoConsulta(
        f.zona && !zona
          ? t("filtrosSinZona", { zona: f.zona })
          : t("filtrosAplicados"),
      );
    } catch {
      setAvisoConsulta(t("errorInterpretar"));
    } finally {
      setInterpretando(false);
    }
  }

  const [resultados, setResultados] = useState<ResultadoTalento[]>([]);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  // Cada búsqueda lleva un número; una respuesta vieja que llega tarde se descarta.
  const corridaRef = useRef(0);

  function alternar<T extends string>(lista: T[], set: (v: T[]) => void, valor: T) {
    set(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);
  }

  const url = useCallback(
    (path: string) => supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl,
    [supabase],
  );

  const buscar = useCallback(
    async (nuevoOffset: number) => {
      const corrida = ++corridaRef.current;
      setCargando(true);

      const conGeo = ubicacion && radioMetros !== null;
      const { data, error } = await supabase.rpc("buscar_talento", {
        p_texto: texto.trim() || null,
        p_edad_min: edadMin ? Number(edadMin) : null,
        p_edad_max: edadMax ? Number(edadMax) : null,
        p_generos: generos.length ? generos : undefined,
        p_habilidades: habilidades.length ? habilidades : undefined,
        p_lat: conGeo ? ubicacion!.lat : null,
        p_lng: conGeo ? ubicacion!.lng : null,
        p_radio_metros: conGeo ? radioMetros : null,
        p_limite: PAGINA,
        p_offset: nuevoOffset,
      });

      if (corrida !== corridaRef.current) return;

      if (error) reportarErrorSupabase(error, { rpc: "buscar_talento" });

      const filas = (error ? [] : ((data ?? []) as Fila[])).map((f) => ({
        id: f.id,
        nombre: f.nombre,
        edad: f.edad,
        ubicacion_publica: f.ubicacion_publica,
        habilidades: f.habilidades,
        fotoUrl: url(f.foto_principal_path),
      }));

      setResultados((prev) => (nuevoOffset === 0 ? filas : [...prev, ...filas]));
      setOffset(nuevoOffset);
      setHayMas(filas.length === PAGINA);
      setCargando(false);
    },
    [supabase, url, texto, edadMin, edadMax, generos, habilidades, ubicacion, radioMetros],
  );

  // Debounce: cambiar cualquier filtro reinicia la búsqueda desde el offset 0.
  useEffect(() => {
    const t = setTimeout(() => buscar(0), 250);
    return () => clearTimeout(t);
  }, [buscar]);

  const opcionesRadio = opcionesDeRadio("km", tEtiquetas);

  const hayFiltros =
    texto.trim() !== "" ||
    edadMin !== "" ||
    edadMax !== "" ||
    generos.length > 0 ||
    habilidades.length > 0 ||
    ubicacion !== null;

  function limpiarFiltros() {
    setTexto("");
    setEdadMin("");
    setEdadMax("");
    setGeneros([]);
    setHabilidades([]);
    setUbicacion(null);
    setRadioMetros(RADIO_INICIAL_METROS);
  }

  const nAvanzados =
    (edadMin !== "" || edadMax !== "" ? 1 : 0) +
    (generos.length > 0 ? 1 : 0) +
    (habilidades.length > 0 ? 1 : 0) +
    (ubicacion !== null ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-borde bg-fondo-sutil/50 p-4">
        <form onSubmit={aplicarConsulta} className="flex flex-col gap-1.5">
          <label htmlFor="buscar-describi" className="text-sm font-medium text-texto">
            {t("describi")}
          </label>
          <div className="flex gap-2">
            <input
              id="buscar-describi"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              maxLength={300}
              placeholder={t("describiPlaceholder")}
              className="min-w-0 flex-1 rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto placeholder:text-texto-tenue focus:border-accion"
            />
            <button
              type="submit"
              disabled={interpretando || consulta.trim().length < 3}
              className="shrink-0 rounded-xl bg-accion px-3.5 text-sm font-semibold text-accion-texto disabled:opacity-50"
            >
              {interpretando ? "…" : tc("buscar")}
            </button>
          </div>
          {avisoConsulta && <p className="text-xs text-texto-tenue">{avisoConsulta}</p>}
        </form>

        <CampoTexto
          id="buscar-nombre"
          etiqueta={tc("buscar")}
          placeholder={t("buscarPlaceholder")}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVerFiltros((v) => !v)}
            aria-expanded={verFiltros}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-texto-tenue hover:text-texto"
          >
            {t("filtros")}
            {nAvanzados > 0 && (
              <span className="rounded-full bg-accion px-1.5 text-2xs font-semibold text-accion-texto">
                {nAvanzados}
              </span>
            )}
            <Icono
              nombre="chevron"
              className={`h-3.5 w-3.5 text-texto-tenue transition-transform ${verFiltros ? "rotate-180" : ""}`}
            />
          </button>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-medium text-texto-tenue underline decoration-ink-300 underline-offset-2 hover:text-texto"
            >
              {t("limpiar")}
            </button>
          )}
        </div>

        <div className={verFiltros ? "flex flex-col gap-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            id="edad-min"
            etiqueta={t("edadMinima")}
            type="number"
            inputMode="numeric"
            min={16}
            value={edadMin}
            onChange={(e) => setEdadMin(e.target.value)}
          />
          <CampoTexto
            id="edad-max"
            etiqueta={t("edadMaxima")}
            type="number"
            inputMode="numeric"
            min={16}
            value={edadMax}
            onChange={(e) => setEdadMax(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-texto">{t("genero")}</span>
          <div className="flex flex-wrap gap-2">
            {GENEROS_BUSCABLES.map((g) => (
              <button
                key={g.valor}
                type="button"
                onClick={() => alternar(generos, setGeneros, g.valor)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  generos.includes(g.valor)
                    ? "border-accion bg-accion text-accion-texto"
                    : "border-borde text-texto-tenue"
                }`}
              >
                {tEtiquetas(claveGenero(g.valor))}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-texto">{t("habilidades")}</span>
          <div className="flex flex-wrap gap-2">
            {HABILIDADES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => alternar(habilidades, setHabilidades, h)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  habilidades.includes(h)
                    ? "border-accion bg-accion text-accion-texto"
                    : "border-borde text-texto-tenue"
                }`}
              >
                {etiquetaHabilidad(h, tEtiquetas)}
              </button>
            ))}
          </div>
        </div>

        <CampoUbicacion
          id="buscar-ubicacion"
          etiqueta={t("cercaDe")}
          valor={ubicacion}
          onCambio={setUbicacion}
          placeholder={t("cercaDePlaceholder")}
        />
        {ubicacion && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="buscar-radio" className="text-2xs font-medium text-texto-tenue">
              {t("radio")}
            </label>
            <select
              id="buscar-radio"
              value={radioMetros ?? ""}
              onChange={(e) => setRadioMetros(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-xl border border-borde bg-superficie px-3 py-2 text-sm text-texto"
            >
              {opcionesRadio.map((o) => (
                <option key={o.etiqueta} value={o.metros ?? ""}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>

      {cargando && resultados.length === 0 ? (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
          role="status"
          aria-label={t("buscando")}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Esqueleto className="aspect-[3/4] rounded-2xl" />
              <Esqueleto className="h-3.5 w-2/3" />
              <Esqueleto className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : resultados.length === 0 ? (
        <EstadoVacio
          icono="buscar"
          titulo={t("vacioTitulo")}
          detalle={t("vacioDetalle")}
        />
      ) : (
        <PilaTalentos
          talentos={resultados}
          iniciativa={iniciativa}
          onCasiVacia={() => {
            if (hayMas && !cargando) buscar(offset + PAGINA);
          }}
        />
      )}
    </div>
  );
}
