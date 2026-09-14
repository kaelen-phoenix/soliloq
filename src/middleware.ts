import { type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await actualizarSesion(request);

  // Defensa en profundidad junto al `robots` de `generateMetadata`: un enlace público de
  // perfil no se indexa, aunque algún rastreador ignore la metaetiqueta.
  if (request.nextUrl.pathname.startsWith("/p/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
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
