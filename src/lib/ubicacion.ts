// Única fuente de verdad sobre ubicaciones, igual que `videoreel.ts` lo es sobre los enlaces
// de video. Todo el acceso a Google vive acá: cambiar de proveedor de geocoding tiene que ser
// reemplazar este archivo, no auditar la aplicación.

export type Ubicacion = {
  texto: string;
  placeId: string | null;
  lat: number;
  lng: number;
  pais: string;
};

export type UnidadDistancia = "km" | "mi";

const METROS_POR_KM = 1000;
const METROS_POR_MILLA = 1609.344;

// Los cuatro países que no usan el sistema métrico para distancias cotidianas.
const PAISES_IMPERIALES = ["US", "GB", "LR", "MM"];

export const RADIO_INICIAL_METROS = 50_000;

/**
 * Unidad con la que arranca alguien según dónde está. Se usa **solo al crear el perfil**:
 * una vez elegida, la unidad es de la persona. Alguien que se mudó de Chicago a Berlín puede
 * seguir pensando en millas, y que la app se la cambie sola es la clase de sorpresa que
 * erosiona la confianza.
 */
export function unidadPorPais(pais: string): UnidadDistancia {
  return PAISES_IMPERIALES.includes(pais.toUpperCase()) ? "mi" : "km";
}

export function metrosAUnidad(metros: number, unidad: UnidadDistancia): number {
  return metros / (unidad === "mi" ? METROS_POR_MILLA : METROS_POR_KM);
}

export function unidadAMetros(valor: number, unidad: UnidadDistancia): number {
  return Math.round(valor * (unidad === "mi" ? METROS_POR_MILLA : METROS_POR_KM));
}

export function etiquetaUnidad(unidad: UnidadDistancia): string {
  return unidad === "mi" ? "millas" : "km";
}

// Los pasos son distintos por unidad y no se convierten entre sí: nadie quiere elegir
// "80,47 km". `null` es "todo el mundo".
const PASOS_KM = [5, 10, 25, 50, 100, 200];
const PASOS_MI = [5, 10, 25, 50, 100];

export type OpcionRadio = { etiqueta: string; metros: number | null };

export function opcionesDeRadio(unidad: UnidadDistancia): OpcionRadio[] {
  const pasos = unidad === "mi" ? PASOS_MI : PASOS_KM;
  return [
    ...pasos.map((paso) => ({
      etiqueta: `${paso} ${etiquetaUnidad(unidad)}`,
      metros: unidadAMetros(paso, unidad),
    })),
    { etiqueta: "Todo el mundo", metros: null },
  ];
}

/**
 * El paso más cercano al radio guardado. Al cambiar de unidad el radio en metros no se toca:
 * se muestra el paso de la unidad nueva que mejor lo representa.
 */
export function radioMasCercano(metros: number | null, unidad: UnidadDistancia): OpcionRadio {
  const opciones = opcionesDeRadio(unidad);
  if (metros === null) return opciones[opciones.length - 1];
  return opciones
    .filter((o): o is OpcionRadio & { metros: number } => o.metros !== null)
    .reduce((mejor, actual) =>
      Math.abs(actual.metros - metros) < Math.abs(mejor.metros - metros) ? actual : mejor,
    );
}

// --- Google Places ---------------------------------------------------------------------

export type SugerenciaUbicacion = { id: string; texto: string };

export class ErrorUbicacion extends Error {}

type PlacesLibrary = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: unknown): Promise<{ suggestions: PlaceSuggestion[] }>;
  };
  AutocompleteSessionToken: new () => object;
};

type PlaceSuggestion = {
  placePrediction: {
    placeId: string;
    text: { toString(): string };
    toPlace(): {
      fetchFields(request: { fields: string[] }): Promise<{ place: PlaceResuelto }>;
    };
  } | null;
};

type PlaceResuelto = {
  id?: string;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
  addressComponents?: { types: string[]; shortText?: string | null }[] | null;
};

declare global {
  interface Window {
    google?: {
      maps?: { importLibrary(nombre: string): Promise<unknown> };
    };
  }
}

let cargaEnCurso: Promise<PlacesLibrary> | null = null;

function cargarPlaces(): Promise<PlacesLibrary> {
  if (cargaEnCurso) return cargaEnCurso;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new ErrorUbicacion("Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));
  }

  cargaEnCurso = new Promise<PlacesLibrary>((resolver, rechazar) => {
    const alCargar = () => {
      window.google?.maps
        ?.importLibrary("places")
        .then((lib) => resolver(lib as PlacesLibrary))
        .catch(() => rechazar(new ErrorUbicacion("No se pudo cargar el buscador de lugares.")));
    };

    const existente = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existente) {
      existente.addEventListener("load", alCargar);
      existente.addEventListener("error", () =>
        rechazar(new ErrorUbicacion("No se pudo cargar el buscador de lugares.")),
      );
      if (window.google?.maps) alCargar();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&language=es`;
    script.async = true;
    script.dataset.googleMaps = "true";
    script.addEventListener("load", alCargar);
    script.addEventListener("error", () =>
      rechazar(new ErrorUbicacion("No se pudo cargar el buscador de lugares.")),
    );
    document.head.appendChild(script);
  });

  // Un fallo no puede dejar la promesa cacheada para siempre: el próximo intento reintenta.
  cargaEnCurso.catch(() => {
    cargaEnCurso = null;
  });

  return cargaEnCurso;
}

/**
 * Un token por sesión de tipeo. Es lo que hace que Google cobre toda la sesión como una sola
 * búsqueda en vez de una por pulsación; sin esto la factura se multiplica por diez.
 * No es opcional.
 */
export class SesionUbicacion {
  private token: object | null = null;
  private sugerencias = new Map<string, PlaceSuggestion>();

  async buscar(texto: string): Promise<SugerenciaUbicacion[]> {
    if (texto.trim().length < 3) return [];

    const places = await cargarPlaces();
    if (!this.token) this.token = new places.AutocompleteSessionToken();

    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: texto,
      sessionToken: this.token,
      includedPrimaryTypes: ["(cities)"],
    });

    this.sugerencias.clear();
    const resultado: SugerenciaUbicacion[] = [];
    for (const sugerencia of suggestions) {
      const prediccion = sugerencia.placePrediction;
      if (!prediccion) continue;
      this.sugerencias.set(prediccion.placeId, sugerencia);
      resultado.push({ id: prediccion.placeId, texto: prediccion.text.toString() });
    }
    return resultado;
  }

  /** Resuelve la sugerencia elegida a una ubicación completa y cierra la sesión de cobro. */
  async resolver(id: string): Promise<Ubicacion> {
    const sugerencia = this.sugerencias.get(id);
    if (!sugerencia?.placePrediction) {
      throw new ErrorUbicacion("Elegí un lugar de la lista.");
    }

    const { place } = await sugerencia.placePrediction
      .toPlace()
      .fetchFields({ fields: ["formattedAddress", "location", "addressComponents"] });

    const ubicacion = aUbicacion(place, sugerencia.placePrediction.text.toString(), id);

    // La sesión termina al elegir: el token siguiente arranca una búsqueda nueva.
    this.token = null;
    this.sugerencias.clear();
    return ubicacion;
  }
}

function aUbicacion(place: PlaceResuelto, textoPrediccion: string, placeId: string): Ubicacion {
  const lat = place.location?.lat();
  const lng = place.location?.lng();
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new ErrorUbicacion("Ese lugar no tiene coordenadas; probá con otro.");
  }

  const pais = place.addressComponents?.find((c) => c.types.includes("country"))?.shortText;
  if (!pais) {
    throw new ErrorUbicacion("Ese lugar no tiene país; probá con otro.");
  }

  return {
    texto: place.formattedAddress ?? textoPrediccion,
    placeId,
    lat,
    lng,
    pais: pais.toUpperCase(),
  };
}

// --- Persistencia ----------------------------------------------------------------------

type FilaUbicacion = {
  ubicacion_texto: string;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
};

export function aColumnas(ubicacion: Ubicacion): FilaUbicacion {
  return {
    ubicacion_texto: ubicacion.texto,
    ubicacion_place_id: ubicacion.placeId,
    ubicacion_lat: ubicacion.lat,
    ubicacion_lng: ubicacion.lng,
    ubicacion_pais: ubicacion.pais,
  };
}

export function desdeColumnas(fila: Partial<FilaUbicacion> | null | undefined): Ubicacion | null {
  if (!fila?.ubicacion_texto || fila.ubicacion_lat == null || fila.ubicacion_lng == null) {
    return null;
  }
  return {
    texto: fila.ubicacion_texto,
    placeId: fila.ubicacion_place_id ?? null,
    lat: fila.ubicacion_lat,
    lng: fila.ubicacion_lng,
    pais: fila.ubicacion_pais ?? "",
  };
}
