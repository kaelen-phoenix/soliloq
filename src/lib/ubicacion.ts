// Única fuente de verdad sobre ubicaciones, igual que `videoreel.ts` lo es sobre los enlaces
// de video. Todo el acceso a Google vive acá: cambiar de proveedor de geocoding tiene que ser
// reemplazar este archivo, no auditar la aplicación.

export type Ubicacion = {
  /**
   * Lo que la persona eligió, con la precisión que haya querido: puede ser una calle y
   * altura. Es lo que ve en su propio formulario, y nunca se le muestra a nadie más.
   */
  texto: string;
  /**
   * La misma ubicación recortada a barrio o ciudad. **Es la única que se publica.**
   *
   * Desde que el campo acepta direcciones exactas, `texto` puede ser el domicilio de
   * alguien, y `perfiles_talento.ubicacion_texto` se le mostraba tal cual a cualquier
   * creador en la bandeja de postulantes. Publicar la dirección de una actriz porque se
   * postuló a una obra es un riesgo real, no una imprecisión de diseño.
   *
   * El corte es a barrio, no a ciudad: "Caballito" es útil para decidir un casting y no
   * ubica a nadie en una puerta.
   */
  publica: string;
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

type ComponenteDireccion = {
  types: string[];
  shortText?: string | null;
  longText?: string | null;
};

type PlaceResuelto = {
  id?: string;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
  addressComponents?: ComponenteDireccion[] | null;
};

// El nombre del callback global que le pasamos a Google en la URL. Tiene que ser accesible
// desde `window` porque el script lo invoca por nombre, no por referencia.
const CALLBACK = "__soliloqPlacesListo";

declare global {
  interface Window {
    google?: { maps?: { places?: PlacesLibrary } };
    __soliloqPlacesListo?: () => void;
  }
}

let cargaEnCurso: Promise<PlacesLibrary> | null = null;

/**
 * Carga la librería `places` esperando el `callback` que dispara Google, no el evento `load`
 * del script. La diferencia importa: el bootstrap de `maps/api/js` sólo *encola* los módulos
 * reales (places.js, main.js…) y termina; en `load` todavía no existe `google.maps.places`.
 * Esperar `load` dejaba la promesa colgada para siempre y el campo se quedaba en
 * "Buscando lugares…" sin sugerencias ni error.
 */
function cargarPlaces(): Promise<PlacesLibrary> {
  if (cargaEnCurso) return cargaEnCurso;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new ErrorUbicacion("Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));
  }

  cargaEnCurso = new Promise<PlacesLibrary>((resolver, rechazar) => {
    const fallo = () => rechazar(new ErrorUbicacion("No se pudo cargar el buscador de lugares."));

    const entregar = () => {
      const places = window.google?.maps?.places;
      if (places?.AutocompleteSuggestion) resolver(places);
      else fallo();
    };

    // Si ya está cargado de antes (por ejemplo tras un reintento), no volvemos a pedirlo.
    if (window.google?.maps?.places) return entregar();

    window[CALLBACK] = entregar;

    const script = document.createElement("script");
    const parametros = new URLSearchParams({
      key: apiKey,
      libraries: "places",
      language: "es",
      loading: "async",
      callback: CALLBACK,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${parametros}`;
    script.async = true;
    script.dataset.googleMaps = "true";
    script.addEventListener("error", fallo);
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
      // `geocode` deja pasar direcciones con altura, barrios (`sublocality`) y ciudades
      // (`locality`), y deja afuera los comercios. Antes decía `(cities)`, que además de no
      // aceptar direcciones devolvía **cero resultados** para un barrio: buscar "Caballito"
      // no traía nada, ni siquiera la ciudad que lo contiene.
      includedPrimaryTypes: ["geocode"],
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

/**
 * Recorta unos componentes de dirección a "barrio, ciudad, país", que es lo máximo que se
 * publica de una persona. Todo lo que ubique en una puerta —altura, calle, edificio, código
 * postal— se descarta acá, y por eso este recorte se hace **al guardar** y no al mostrar: si
 * dependiera de cada pantalla, alcanzaría con una que se olvide para filtrar el domicilio.
 *
 * Se piden hasta tres partes de lo más específico a lo más general y se cortan las
 * repeticiones: en la Ciudad de Buenos Aires la ciudad y la provincia son la misma palabra,
 * y "Buenos Aires, Buenos Aires, Argentina" se lee como un error.
 */
function etiquetaPublica(componentes: ComponenteDireccion[] | null | undefined): string | null {
  const de = (tipo: string) => {
    const c = componentes?.find((x) => x.types.includes(tipo));
    return c?.longText ?? c?.shortText ?? null;
  };

  const barrio = de("sublocality_level_1") ?? de("sublocality");
  const ciudad = de("locality");
  const provincia = de("administrative_area_level_1");
  const pais = de("country");

  // El barrio y la provincia no conviven: "Caballito, Buenos Aires, Argentina" alcanza para
  // ubicar a cualquiera, y sumarle la provincia sólo alarga. Pero cuando **no** hay barrio,
  // la provincia hace falta de verdad: hay un Rosario en Santa Fe y otro en Salta, y un
  // Caseros en cada provincia del país.
  const candidatas = barrio
    ? [barrio, ciudad ?? provincia, pais]
    : [ciudad ?? provincia, ciudad ? provincia : null, pais];

  const partes: string[] = [];
  for (const parte of candidatas) {
    if (parte && !partes.includes(parte)) partes.push(parte);
  }
  return partes.length > 0 ? partes.join(", ") : null;
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
    // El fallback nunca puede ser el texto completo: sería publicar la dirección justo
    // cuando falló lo que la iba a recortar. Como acá ya sabemos que hay país, la etiqueta
    // trae al menos ese componente y en la práctica no se cae — pero si se cayera, que sea
    // de más a menos preciso, no al revés.
    publica: etiquetaPublica(place.addressComponents) ?? pais,
    placeId,
    lat,
    lng,
    pais: pais.toUpperCase(),
  };
}

// --- Ubicación del dispositivo ----------------------------------------------------------

type ResultadoGeocoding = {
  formatted_address?: string;
  address_components?: { types: string[]; long_name?: string; short_name?: string }[];
};

/**
 * Traduce las coordenadas del GPS a una ubicación con nombre.
 *
 * Va por la Geocoding API y no por Places porque es la que hace geocodificación inversa;
 * Places resuelve un lugar ya elegido, no responde "qué hay en estas coordenadas".
 *
 * Se conservan las coordenadas del dispositivo, no las que devuelve Google: el GPS ya sabe
 * dónde está la persona con más precisión que el centro de la cuadra que le corresponde a
 * la dirección. Lo único que se toma de la respuesta es cómo se llama ese lugar.
 */
export async function ubicacionDesdeCoordenadas(lat: number, lng: number): Promise<Ubicacion> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new ErrorUbicacion("Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new ErrorUbicacion("No pudimos identificar tu ubicación.");

  const datos = (await respuesta.json()) as { status?: string; results?: ResultadoGeocoding[] };
  const primero = datos.results?.[0];
  if (datos.status !== "OK" || !primero) {
    throw new ErrorUbicacion("No pudimos identificar tu ubicación. Escribila a mano.");
  }

  // La Geocoding API usa `long_name`/`short_name`; Places usa `longText`/`shortText`. Se
  // normaliza acá para que `etiquetaPublica` no tenga que conocer los dos formatos.
  const componentes: ComponenteDireccion[] = (primero.address_components ?? []).map((c) => ({
    types: c.types,
    longText: c.long_name ?? null,
    shortText: c.short_name ?? null,
  }));

  const pais = componentes.find((c) => c.types.includes("country"))?.shortText;
  if (!pais) throw new ErrorUbicacion("No pudimos identificar tu país. Escribí tu ubicación.");

  const texto = primero.formatted_address ?? `${lat}, ${lng}`;
  return {
    texto,
    publica: etiquetaPublica(componentes) ?? pais,
    // Sin `placeId`: esto no salió de una sugerencia de Places, y guardar uno inventado
    // haría creer que se puede volver a resolver contra Google.
    placeId: null,
    lat,
    lng,
    pais: pais.toUpperCase(),
  };
}

// --- Persistencia ----------------------------------------------------------------------

type FilaUbicacion = {
  ubicacion_texto: string;
  ubicacion_publica: string;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
};

export function aColumnas(ubicacion: Ubicacion): FilaUbicacion {
  return {
    ubicacion_texto: ubicacion.texto,
    ubicacion_publica: ubicacion.publica,
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
    // Las filas anteriores a la migración 0025 no tienen la columna cargada. Se cae al texto
    // completo, que en esas filas ya era una ciudad: hasta ahora el campo sólo aceptaba eso.
    publica: fila.ubicacion_publica ?? fila.ubicacion_texto,
    placeId: fila.ubicacion_place_id ?? null,
    lat: fila.ubicacion_lat,
    lng: fila.ubicacion_lng,
    pais: fila.ubicacion_pais ?? "",
  };
}
