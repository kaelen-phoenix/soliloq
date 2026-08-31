import { REDES, type ClaveRed, type Red } from "@/lib/constantes";

// Normalización y validación de las redes del perfil de talento.
//
// La regla de fondo (ver el design del change `redes-sociales-perfil-talento`): se acepta
// tanto un identificador (`@usuario` o `usuario`) como una URL completa, y se guarda siempre
// una URL canónica. Si lo cargado no puede llevarse a una URL de esa red, la función
// devuelve `null` y el formulario marca el campo.

const ESQUEMA = /^[a-z][a-z0-9+.-]*:\/\//i;
const HTTP_EXPLICITO = /^http:\/\//i;
// Un identificador razonable: arranca con alfanumérico y sigue con letras, números, punto,
// guion, guion bajo o barra (LinkedIn admite `in/nombre`). Sin espacios ni signos raros:
// eso es "texto basura" y tiene que fallar, no convertirse en un handle inventado.
const IDENTIFICADOR = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,98}$/;

function parsear(entrada: string): URL | null {
  try {
    return new URL(entrada);
  } catch {
    return null;
  }
}

function canonizar(host: string, pathname: string, query: string): string {
  const path = pathname.replace(/\/+$/, "");
  return `https://${host}${path}${query}`;
}

/**
 * Lleva `entrada` a la URL canónica de la red `clave`, o `null` si no se puede.
 *
 * - Vacío / solo espacios → `null`.
 * - Empieza con `@`, o no parece URL (sin punto ni esquema) → identificador: se le antepone
 *   el prefijo canónico de la red.
 * - Parece URL → se le antepone `https://` si no trae esquema, se parsea, y se exige que el
 *   host pertenezca a la red. La canónica descarta query y hash salvo que la red los pida
 *   (YouTube conserva `?v=` en `/watch`).
 * - `sitio` (web propio): cualquier host con un punto, siempre que resulte una URL `https`.
 *   Un `http://` explícito se rechaza.
 * - Idempotente: normalizar una URL ya canónica devuelve lo mismo.
 */
export function normalizarRed(clave: ClaveRed, entrada: string): string | null {
  const bruto = entrada.trim();
  if (!bruto) return null;

  const red = REDES.find((r) => r.clave === clave);
  if (!red) return null;

  const traeEsquema = ESQUEMA.test(bruto);

  if (clave === "sitio") {
    if (HTTP_EXPLICITO.test(bruto)) return null;
    const url = parsear(traeEsquema ? bruto : `https://${bruto}`);
    if (!url || url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return canonizar(url.host.toLowerCase(), url.pathname, "");
  }

  const esIdentificador = bruto.startsWith("@") || (!traeEsquema && !bruto.includes("."));
  if (esIdentificador) {
    const id = bruto.replace(/^@+/, "").replace(/^\/+/, "").trim();
    if (!IDENTIFICADOR.test(id)) return null;
    return red.prefijoCanonico + id;
  }

  const url = parsear(traeEsquema ? bruto : `https://${bruto}`);
  if (!url) return null;

  const host = url.host.toLowerCase();
  if (!red.hosts.includes(host)) return null;

  return canonizar(red.hosts[0], url.pathname, queryConservada(red, clave, url));
}

function queryConservada(red: Red, clave: ClaveRed, url: URL): string {
  if (!red.conservarQuery || clave !== "youtube" || url.pathname !== "/watch") return "";
  const v = url.searchParams.get("v");
  return v ? `?v=${v}` : "";
}

function mensajeError(red: Red): string {
  if (red.clave === "sitio") {
    return "Ingresá una dirección web válida que empiece con https://";
  }
  return `Ese enlace no parece de ${red.etiqueta}. Revisá el usuario o la URL.`;
}

/**
 * Aplica `normalizarRed` a cada campo no vacío. Los vacíos se omiten (la red queda sin
 * cargar). Un campo que no normaliza va a `errores` y no a `redes`.
 */
export function validarRedes(entradas: Partial<Record<ClaveRed, string>>): {
  redes: Record<string, string>;
  errores: Record<string, string>;
} {
  const redes: Record<string, string> = {};
  const errores: Record<string, string> = {};

  for (const red of REDES) {
    const cruda = (entradas[red.clave] ?? "").trim();
    if (!cruda) continue;
    const normal = normalizarRed(red.clave, cruda);
    if (normal) redes[red.clave] = normal;
    else errores[red.clave] = mensajeError(red);
  }

  return { redes, errores };
}
