"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Esqueleto } from "@/components/ui/esqueleto";
import { toque, usePrefiereReduccion, variantesSeguras } from "@/components/ui/movimiento";
import { GENEROS_BUSCABLES, HABILIDADES, type Genero } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/client";
import { opcionesDeRadio, RADIO_INICIAL_METROS, type Ubicacion } from "@/lib/ubicacion";
import { TarjetaTalento, type ResultadoTalento } from "./tarjeta-talento";

const PAGINA = 24;

type Fila = Omit<ResultadoTalento, "fotoUrl"> & { foto_principal_path: string };

export function BuscadorTalento() {
  const supabase = createClient();

  const [texto, setTexto] = useState("");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [radioMetros, setRadioMetros] = useState<number | null>(RADIO_INICIAL_METROS);

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

  const opcionesRadio = opcionesDeRadio("km");
  const prefiereReduccion = usePrefiereReduccion();
  const { lista, item } = variantesSeguras(prefiereReduccion);

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

  const conteo = hayMas
    ? `${resultados.length}+ resultados`
    : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
        <div className="flex items-end justify-between gap-3">
          <span className="text-2xs font-medium uppercase tracking-wide text-ink-400">
            Filtros
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-medium text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-900"
            >
              Limpiar
            </button>
          )}
        </div>

        <CampoTexto
          id="buscar-nombre"
          etiqueta="Buscar"
          placeholder="Nombre, habilidad o experiencia"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <div className="flex gap-3">
          <CampoTexto
            id="edad-min"
            etiqueta="Edad mínima"
            type="number"
            inputMode="numeric"
            min={16}
            value={edadMin}
            onChange={(e) => setEdadMin(e.target.value)}
          />
          <CampoTexto
            id="edad-max"
            etiqueta="Edad máxima"
            type="number"
            inputMode="numeric"
            min={16}
            value={edadMax}
            onChange={(e) => setEdadMax(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Género</span>
          <div className="flex flex-wrap gap-2">
            {GENEROS_BUSCABLES.map((g) => (
              <button
                key={g.valor}
                type="button"
                onClick={() => alternar(generos, setGeneros, g.valor)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  generos.includes(g.valor)
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-100 text-ink-500"
                }`}
              >
                {g.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Habilidades</span>
          <div className="flex flex-wrap gap-2">
            {HABILIDADES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => alternar(habilidades, setHabilidades, h)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  habilidades.includes(h)
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-100 text-ink-500"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <CampoUbicacion
          id="buscar-ubicacion"
          etiqueta="Cerca de"
          valor={ubicacion}
          onCambio={setUbicacion}
          placeholder="Ciudad o barrio"
        />
        {ubicacion && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="buscar-radio" className="text-2xs font-medium text-ink-400">
              Radio
            </label>
            <select
              id="buscar-radio"
              value={radioMetros ?? ""}
              onChange={(e) => setRadioMetros(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
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

      {cargando && resultados.length === 0 ? (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
          role="status"
          aria-label="Buscando"
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
          titulo="Sin coincidencias"
          detalle="No hay talento que coincida con esos filtros. Probá aflojando alguno."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-400">{conteo}</p>
            <motion.div
              className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
              variants={lista}
              initial="oculto"
              animate="visible"
            >
              {resultados.map((t) => (
                <motion.div
                  key={t.id}
                  variants={item}
                  whileTap={prefiereReduccion ? undefined : toque}
                >
                  <TarjetaTalento talento={t} />
                </motion.div>
              ))}
            </motion.div>
          </div>
          {hayMas && (
            <div className="flex justify-center">
              <Boton
                variante="secundario"
                cargando={cargando}
                textoCargando="Cargando…"
                onClick={() => buscar(offset + PAGINA)}
              >
                Cargar más
              </Boton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
