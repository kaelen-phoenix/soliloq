import { etiquetaPublica, type ComponenteDireccion, type SugerenciaUbicacion, type Ubicacion } from "@/lib/ubicacion";

/**
 * El buscador de lugares para la app nativa (#392). La web usa la librería de Google Maps en el
 * navegador (`SesionUbicacion`); la app no puede, así que pasa por acá (`/api/app/ubicacion`) y
 * el servidor llama a las APIs REST de Places y Geocoding con la misma clave. Las reglas de
 * privacidad son las mismas: lo que se publica es `etiquetaPublica` (barrio, ciudad, país).
 */

const CLAVE = () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// La clave está restringida al sitio: se llama como yalope.com.
const ENCABEZADOS = (clave: string) => ({ "X-Goog-Api-Key": clave, Referer: "https://yalope.com/" });

export class ErrorLugar extends Error {}

export async function buscarLugares(texto: string, sesion: string, idioma: string): Promise<SugerenciaUbicacion[]> {
  const clave = CLAVE();
  if (!clave) throw new ErrorLugar("sin clave");
  if (texto.trim().length < 3) return [];
  const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { ...ENCABEZADOS(clave), "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texto,
      sessionToken: sesion,
      languageCode: idioma,
      // Direcciones, barrios y ciudades; sin comercios (igual que la web).
      includedPrimaryTypes: ["geocode"],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new ErrorLugar(`autocomplete ${r.status}`);
  const datos = (await r.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text?: { text?: string } } }[];
  };
  return (datos.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text?: { text?: string } } => !!p?.placeId)
    .map((p) => ({ id: p.placeId, texto: p.text?.text ?? "" }));
}

export async function resolverLugar(id: string, sesion: string, idioma: string): Promise<Ubicacion> {
  const clave = CLAVE();
  if (!clave) throw new ErrorLugar("sin clave");
  if (!/^[\w-]{10,300}$/.test(id)) throw new ErrorLugar("id inválido");
  const url = `https://places.googleapis.com/v1/places/${id}?sessionToken=${encodeURIComponent(sesion)}&languageCode=${idioma}`;
  const r = await fetch(url, {
    headers: { ...ENCABEZADOS(clave), "X-Goog-FieldMask": "formattedAddress,location,addressComponents" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new ErrorLugar(`place ${r.status}`);
  const lugar = (await r.json()) as {
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    addressComponents?: ComponenteDireccion[];
  };
  const lat = lugar.location?.latitude;
  const lng = lugar.location?.longitude;
  const pais = lugar.addressComponents?.find((c) => c.types.includes("country"))?.shortText;
  if (typeof lat !== "number" || typeof lng !== "number" || !pais) throw new ErrorLugar("lugar incompleto");
  return {
    texto: lugar.formattedAddress ?? "",
    publica: etiquetaPublica(lugar.addressComponents) ?? pais,
    placeId: id,
    lat,
    lng,
    pais: pais.toUpperCase(),
  };
}

/** Coordenadas del GPS → lugar con nombre (como `ubicacionDesdeCoordenadas` de la web). */
export async function lugarDesdeCoordenadas(lat: number, lng: number, idioma: string): Promise<Ubicacion> {
  const clave = CLAVE();
  if (!clave) throw new ErrorLugar("sin clave");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ErrorLugar("coordenadas inválidas");
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${clave}&language=${idioma}`;
  const r = await fetch(url, { headers: { Referer: "https://yalope.com/" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new ErrorLugar(`geocode ${r.status}`);
  const datos = (await r.json()) as {
    status?: string;
    results?: { formatted_address?: string; address_components?: { types: string[]; long_name?: string; short_name?: string }[] }[];
  };
  const primero = datos.results?.[0];
  if (datos.status !== "OK" || !primero) throw new ErrorLugar(`geocode ${datos.status}`);
  const componentes: ComponenteDireccion[] = (primero.address_components ?? []).map((c) => ({
    types: c.types,
    longText: c.long_name ?? null,
    shortText: c.short_name ?? null,
  }));
  const pais = componentes.find((c) => c.types.includes("country"))?.shortText;
  if (!pais) throw new ErrorLugar("sin país");
  return {
    texto: primero.formatted_address ?? `${lat}, ${lng}`,
    publica: etiquetaPublica(componentes) ?? pais,
    // Las coordenadas del GPS, no las de Google: son más precisas (igual que la web).
    placeId: null,
    lat,
    lng,
    pais: pais.toUpperCase(),
  };
}
