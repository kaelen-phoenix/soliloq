import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSegunEstado } from "../cuenta";
import { leerEstadoCuenta } from "../cuenta-servidor";
import type { Database } from "./types";

const RUTAS_PUBLICAS = ["/ingresar", "/recuperar", "/auth/callback", "/bienvenida"];

// Elegir contraseña tiene que estar disponible con sesión iniciada aunque el
// onboarding esté a medias: se llega ahí desde el enlace de recuperación.
const RUTAS_SIEMPRE_DISPONIBLES = ["/cambiar-clave"];

// El enlace público del perfil (`/p/[token]`) y las Normas de la Comunidad (`/normas`) se
// sirven igual con o sin sesión: a diferencia de `RUTAS_PUBLICAS`, acá un usuario logueado
// NO se rebota a `/` — hace falta poder abrir `/normas` desde el gate de `/aceptar-normas`
// sin salir de esa pantalla.
const RUTAS_ABIERTAS = ["/p/", "/normas"];

/** Solo destinos internos: `next` viaja por la URL y no puede convertirse en un redirect abierto. */
function conNext(destino: string, next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next === "/") return destino;
  return `${destino}?next=${encodeURIComponent(next)}`;
}

export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esRutaPublica = RUTAS_PUBLICAS.some((r) => path.startsWith(r));
  const esRutaAbierta = RUTAS_ABIERTAS.some((r) => path.startsWith(r));

  // `destino` puede traer query (`conNext`): separarla es necesario porque `url.pathname`
  // no acepta un `?` adentro.
  const redirigir = (destino: string) => {
    const [pathname, search] = destino.split("?");
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return NextResponse.redirect(url);
  };

  if (esRutaAbierta) return response;

  if (!user) {
    if (esRutaPublica) return response;
    // Sin sesión, la raíz muestra la landing; el resto pide entrar.
    return redirigir(path === "/" ? "/bienvenida" : "/ingresar");
  }

  if (esRutaPublica) return redirigir("/");

  if (RUTAS_SIEMPRE_DISPONIBLES.some((r) => path.startsWith(r))) return response;

  const estado = await leerEstadoCuenta(supabase, user.id);
  const destino = destinoSegunEstado(estado);

  const enAltaPerfil = path.startsWith("/completar-perfil");
  const enSolicitudPendiente = path.startsWith("/solicitud-pendiente");
  const enAceptarNormas = path.startsWith("/aceptar-normas");

  if (destino === "solicitud-pendiente") {
    return enSolicitudPendiente ? response : redirigir(conNext("/solicitud-pendiente", path));
  }

  if (destino === "aceptar-normas") {
    return enAceptarNormas ? response : redirigir(conNext("/aceptar-normas", path));
  }

  if (destino === "completar-perfil") {
    return enAltaPerfil ? response : redirigir(conNext("/completar-perfil", path));
  }

  // Onboarding terminado: esas pantallas ya no aplican.
  if (enAltaPerfil || enSolicitudPendiente || enAceptarNormas) return redirigir("/");

  return response;
}
