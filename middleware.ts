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
    // La raíz va explícita: el patrón con lookahead de abajo no matchea `/` (gotcha
    // conocido de Next), y sin esto un anónimo en `yalope.com` nunca pasa por el
    // middleware y lo rebota el layout de `(app)` a `/ingresar` en vez de a la landing.
    "/",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
