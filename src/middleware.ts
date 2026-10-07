import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/middleware";
import { detectarIdioma, esIdioma, esRutaPorIdioma, separarIdioma, type Idioma } from "@/i18n/idiomas";

const COOKIE_IDIOMA = "NEXT_LOCALE";
const OPCIONES_COOKIE_IDIOMA = { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, path: "/" };

/** El idioma de quien entra a una página pública sin prefijo: el elegido, o el del navegador. */
function idiomaPreferido(request: NextRequest): Idioma {
  const cookie = request.cookies.get(COOKIE_IDIOMA)?.value;
  return esIdioma(cookie) ? cookie : detectarIdioma(request.headers.get("accept-language"));
}

/** Una respuesta nueva (rewrite o redirect) conserva las cookies que dejó la sesión de Supabase. */
function conCookiesDe(nueva: NextResponse, base: NextResponse) {
  base.cookies.getAll().forEach((c) => nueva.cookies.set(c));
  return nueva;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const { idioma: idiomaUrl, resto } = separarIdioma(path);

  // #237: `/es/…` es la versión sin prefijo. Se recuerda la elección (el «Español» de las
  // páginas públicas lleva acá) y se vuelve a la URL canónica.
  // `/en` o `/es` solos van a la raíz recordando el idioma: ahí está la portada (o la app).
  if (idiomaUrl === "es" || (idiomaUrl === "en" && resto === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = resto;
    const r = NextResponse.redirect(url);
    r.cookies.set(COOKIE_IDIOMA, idiomaUrl, OPCIONES_COOKIE_IDIOMA);
    return r;
  }

  const { respuesta, userId } = await actualizarSesion(request);
  if (respuesta.headers.get("location")) return respuesta;

  // Defensa en profundidad junto al `robots` de `generateMetadata`: un enlace público de
  // perfil no se indexa, aunque algún rastreador ignore la metaetiqueta.
  if (path.startsWith("/p/")) {
    respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  if (idiomaUrl === "en") {
    // Solo las páginas públicas existen con `/en`: el resto vuelve a su URL, y la app sigue
    // en inglés por la cookie.
    if (!esRutaPorIdioma(resto)) {
      const url = request.nextUrl.clone();
      url.pathname = resto;
      const r = conCookiesDe(NextResponse.redirect(url), respuesta);
      r.cookies.set(COOKIE_IDIOMA, "en", OPCIONES_COOKIE_IDIOMA);
      return r;
    }
    // Se recuerda solo en una navegación de verdad: las precargas de los enlaces `/en/…` de
    // una página en inglés no pueden pisar un «Español» que se tocó mientras tanto.
    // Next 14 le saca al middleware el header `RSC` y el `?_rsc=`, así que se mira lo que manda
    // el navegador: una navegación es `Sec-Fetch-Mode: navigate`; las precargas del router son
    // `cors`. Sin el header (clientes viejos, curl) cuenta como navegación.
    const modo = request.headers.get("sec-fetch-mode");
    const esPrecarga = modo !== null && modo !== "navigate";
    if (!esPrecarga && request.cookies.get(COOKIE_IDIOMA)?.value !== "en") {
      respuesta.cookies.set(COOKIE_IDIOMA, "en", OPCIONES_COOKIE_IDIOMA);
    }
    return respuesta;
  }

  // La portada para quien no tiene sesión, en `/` mismo (200, indexable), en su idioma.
  if (path === "/" && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = `/${idiomaPreferido(request)}/bienvenida`;
    return conCookiesDe(NextResponse.rewrite(url), respuesta);
  }

  // Página pública sin prefijo: en inglés va a `/en/…`; en castellano se sirve ahí mismo la
  // versión que vive en `app/[idioma]` con `idioma = es`.
  if (esRutaPorIdioma(path)) {
    const url = request.nextUrl.clone();
    if (idiomaPreferido(request) === "en") {
      url.pathname = `/en${path}`;
      return conCookiesDe(NextResponse.redirect(url), respuesta);
    }
    url.pathname = `/es${path}`;
    return conCookiesDe(NextResponse.rewrite(url), respuesta);
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Rutas de metadata/PWA generadas por convención de archivo (`manifest.ts`, `robots.ts`,
    // `sitemap.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`) y `public/sw.js`: se
    // sirven sin sesión (crawlers, instaladores de PWA, el navegador registrando el service
    // worker) y no tienen guarda propia como `/p/`, así que hay que excluirlas acá.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|sw.js|apple-icon|icon|opengraph-image|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
