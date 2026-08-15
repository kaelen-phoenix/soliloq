"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ErrorUbicacion,
  SesionUbicacion,
  ubicacionDesdeCoordenadas,
  type SugerenciaUbicacion,
  type Ubicacion,
} from "@/lib/ubicacion";

interface Props {
  etiqueta: string;
  id: string;
  valor: Ubicacion | null;
  onCambio: (ubicacion: Ubicacion | null) => void;
  error?: string;
  placeholder?: string;
}

/**
 * Solo acepta un lugar elegido de la lista. Escribir texto sin elegir sugerencia deja el
 * campo sin ubicación resuelta a propósito: una ubicación sin coordenadas no sirve para el
 * filtro por distancia, que es la razón de ser de este campo.
 */
export function CampoUbicacion({ etiqueta, id, valor, onCambio, error, placeholder }: Props) {
  const sesion = useMemo(() => new SesionUbicacion(), []);
  const [texto, setTexto] = useState(valor?.texto ?? "");
  const [sugerencias, setSugerencias] = useState<SugerenciaUbicacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Sincroniza el input cuando la ubicación cambia desde afuera, pero sólo si hay una
  // resuelta: al editar, `onCambio(null)` deja `valor` en null a propósito, y pisar el campo
  // ahí borraría lo que se está tipeando. Ese era el bug de la edición de perfil — el campo
  // se vaciaba en la primera tecla y por eso nunca llegaba a buscar.
  useEffect(() => {
    if (valor) setTexto(valor.texto);
  }, [valor]);

  // Cierra el desplegable al tocar fuera, sin descartar la ubicación ya elegida.
  useEffect(() => {
    const alTocarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    return () => document.removeEventListener("mousedown", alTocarFuera);
  }, []);

  useEffect(() => {
    if (texto.trim().length < 3 || texto === valor?.texto) {
      setSugerencias([]);
      // Sin esto, borrar el campo mientras había una búsqueda en curso dejaba
      // "Buscando lugares…" prendido para siempre.
      setBuscando(false);
      return;
    }

    let vigente = true;
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      try {
        const resultado = await sesion.buscar(texto);
        if (!vigente) return;
        setSugerencias(resultado);
        setAbierto(true);
      } catch (e) {
        if (!vigente) return;
        // Un fallo del servicio no borra la ubicación guardada: solo deja de sugerir.
        setSugerencias([]);
        setErrorBusqueda(
          e instanceof ErrorUbicacion ? e.message : "No se pudo buscar lugares. Probá de nuevo.",
        );
      } finally {
        // Se apaga siempre, incluso si la petición quedó superada. Antes estaba guardado
        // por `vigente` y el cartel se colgaba prendido. El precio de apagarlo siempre es
        // que puede irse un instante antes de tiempo si justo arrancó otra búsqueda; es
        // preferible a que quede trabado.
        setBuscando(false);
      }
    }, 300);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [texto, valor?.texto, sesion]);

  const elegir = async (sugerencia: SugerenciaUbicacion) => {
    setAbierto(false);
    setBuscando(true);
    try {
      const ubicacion = await sesion.resolver(sugerencia.id);
      onCambio(ubicacion);
      setTexto(ubicacion.texto);
      setSugerencias([]);
      setErrorBusqueda(null);
    } catch (e) {
      setErrorBusqueda(
        e instanceof ErrorUbicacion ? e.message : "No se pudo resolver ese lugar. Probá con otro.",
      );
    } finally {
      setBuscando(false);
    }
  };

  /**
   * Pide la ubicación del dispositivo. El navegador muestra su propio permiso, así que no
   * hay que anticiparlo con un cartel — pero sí hay que distinguir "dijo que no" de "falló",
   * porque son dos problemas con dos salidas distintas.
   */
  async function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setErrorBusqueda("Tu navegador no puede darnos tu ubicación. Escribila a mano.");
      return;
    }

    setUbicando(true);
    setErrorBusqueda(null);
    setAbierto(false);

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        try {
          const ubicacion = await ubicacionDesdeCoordenadas(
            posicion.coords.latitude,
            posicion.coords.longitude,
          );
          onCambio(ubicacion);
          setTexto(ubicacion.texto);
          setSugerencias([]);
        } catch (e) {
          setErrorBusqueda(
            e instanceof ErrorUbicacion ? e.message : "No pudimos identificar tu ubicación.",
          );
        } finally {
          setUbicando(false);
        }
      },
      (error) => {
        setUbicando(false);
        setErrorBusqueda(
          error.code === error.PERMISSION_DENIED
            ? "No nos diste permiso para usar tu ubicación. Podés escribirla igual."
            : "No pudimos obtener tu ubicación. Probá escribiéndola.",
        );
      },
      // Diez segundos y sin cachear: una ubicación vieja acá es peor que ninguna, porque se
      // guarda como si fuera dónde está la persona ahora.
      { timeout: 10_000, maximumAge: 0 },
    );
  }

  const sinResolver = texto.trim().length > 0 && texto !== valor?.texto;

  return (
    <div className="flex flex-col gap-1.5" ref={contenedor}>
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          value={texto}
          autoComplete="off"
          placeholder={placeholder ?? "Dirección, barrio o ciudad"}
          onChange={(e) => {
            setTexto(e.target.value);
            // Editar el texto invalida la ubicación resuelta: no puede quedar un lugar
            // guardado que no se corresponde con lo que se lee en el campo.
            if (valor) onCambio(null);
          }}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-ink-900 transition-colors placeholder:text-ink-400 focus:border-ink-900 ${
            error ? "border-error-400" : "border-ink-200"
          }`}
        />
        {abierto && sugerencias.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
            {sugerencias.map((sugerencia) => (
              <li key={sugerencia.id}>
                <button
                  type="button"
                  onClick={() => elegir(sugerencia)}
                  className="w-full px-3.5 py-2.5 text-left text-base text-ink-800 hover:bg-ink-50"
                >
                  {sugerencia.texto}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={usarMiUbicacion}
        disabled={ubicando}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-600 underline underline-offset-4 hover:text-ink-900 disabled:text-ink-400 disabled:no-underline"
      >
        {ubicando ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
      </button>

      {buscando && <p className="text-xs text-ink-500">Buscando lugares…</p>}
      {errorBusqueda && <p className="text-xs text-error-600">{errorBusqueda}</p>}
      {!buscando && !errorBusqueda && sinResolver && (
        <p className="text-xs text-ink-500">Elegí un lugar de la lista para confirmarlo.</p>
      )}
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}
