export interface Videoreel {
  plataforma: "youtube" | "vimeo";
  id: string;
  /** Hash de video no listado de Vimeo, necesario para embeberlo. */
  hash?: string;
}

const HOSTS_YOUTUBE = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
const HOSTS_YOUTUBE_CORTO = ["youtu.be", "www.youtu.be"];
const HOSTS_VIMEO = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];

const ID_YOUTUBE = /^[\w-]{11}$/;
const SOLO_DIGITOS = /^\d+$/;

/**
 * Extrae plataforma e id de un enlace de videoreel. Es la única fuente de verdad:
 * el formulario valida con esto y el reproductor embebe con esto, así no pueden
 * discrepar (antes eran dos expresiones regulares distintas y una aceptaba
 * enlaces que la otra no sabía mostrar).
 *
 * Devuelve null si el enlace no es de una plataforma admitida.
 */
export function parsearVideoreel(entrada: string): Videoreel | null {
  const texto = entrada.trim();
  if (!texto) return null;

  let url: URL;
  try {
    // Tolera que la persona pegue el enlace sin protocolo.
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segmentos = url.pathname.split("/").filter(Boolean);

  if (HOSTS_YOUTUBE_CORTO.includes(host)) {
    const id = segmentos[0];
    return id && ID_YOUTUBE.test(id) ? { plataforma: "youtube", id } : null;
  }

  if (HOSTS_YOUTUBE.includes(host)) {
    // /watch?v=ID — el parámetro puede venir en cualquier posición.
    const desdeQuery = url.searchParams.get("v");
    if (desdeQuery && ID_YOUTUBE.test(desdeQuery)) {
      return { plataforma: "youtube", id: desdeQuery };
    }
    // /shorts/ID, /live/ID, /embed/ID, /v/ID
    if (["shorts", "live", "embed", "v"].includes(segmentos[0]) && segmentos[1]) {
      const id = segmentos[1];
      return ID_YOUTUBE.test(id) ? { plataforma: "youtube", id } : null;
    }
    return null;
  }

  if (HOSTS_VIMEO.includes(host)) {
    // El id es el último segmento numérico; cubre /ID, /channels/x/ID,
    // /groups/x/videos/ID y /video/ID.
    const indiceId = segmentos.findLastIndex((s) => SOLO_DIGITOS.test(s));
    if (indiceId === -1) return null;

    const id = segmentos[indiceId];
    // Videos no listados: /ID/HASH. También puede venir como ?h=HASH.
    const hash = segmentos[indiceId + 1] ?? url.searchParams.get("h") ?? undefined;
    return { plataforma: "vimeo", id, ...(hash ? { hash } : {}) };
  }

  return null;
}

export function urlEmbedVideoreel(videoreel: Videoreel): string {
  if (videoreel.plataforma === "youtube") {
    return `https://www.youtube.com/embed/${videoreel.id}`;
  }
  const base = `https://player.vimeo.com/video/${videoreel.id}`;
  return videoreel.hash ? `${base}?h=${videoreel.hash}` : base;
}

export function esVideoreelValido(url: string): boolean {
  return parsearVideoreel(url) !== null;
}
