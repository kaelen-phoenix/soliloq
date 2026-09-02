import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSegunEstado } from "../cuenta";
import { leerEstadoCuenta } from "../cuenta-servidor";
import type { Database } from "./types";

const RUTAS_PUBLICAS = ["/ingresar", "/recuperar", "/auth/callback", "/bienvenida"];

// Elegir contraseña tiene que estar disponible con sesión iniciada aunque el
// onboarding esté a medias: se llega ahí desde el enlace de recuperación.
const RUTAS_SIEMPRE_DISPONIBLES = ["/cambiar-clave"];

// El enlace público del perfil (`/p/[token]`) se sirve igual con o sin sesión: a diferencia
// de `RUTAS_PUBLICAS`, acá un usuario logueado NO se rebota a `/` — la vidriera es para
// cualquiera, tenga cuenta o no.
const RUTAS_ABIERTAS = ["/p/"];

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

  const enRol = path.startsWith("/elegir-rol");
  const enAltaPerfil = path.startsWith("/completar-perfil");
  // Alta del segundo perfil: solo tiene sentido con el onboarding ya resuelto.
  const enPerfilNuevo = path.startsWith("/perfil/nuevo");

  if (destino === "elegir-rol") {
    return enRol ? response : redirigir(conNext("/elegir-rol", path));
  }

  if (destino === "completar-perfil") {
    // Se permite volver a /elegir-rol para corregir mientras no exista ningún perfil.
    return enRol || enAltaPerfil ? response : redirigir(conNext("/completar-perfil", path));
  }

  // Con al menos un perfil creado, el onboarding terminó: esas pantallas ya no aplican.
  if (enRol || enAltaPerfil) return redirigir("/");

  // El alta del segundo perfil es válida solo si falta alguno.
  if (enPerfilNuevo && estado.tieneAmbosPerfiles) return redirigir("/perfil");

  return response;
}
