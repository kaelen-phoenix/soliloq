import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSegunEstado } from "../cuenta";
import { separarIdioma } from "@/i18n/idiomas";
import { leerEstadoCuenta } from "../cuenta-servidor";
import type { Database } from "./types";

const RUTAS_PUBLICAS = ["/ingresar", "/recuperar", "/auth/callback", "/bienvenida"];

// Elegir contraseña tiene que estar disponible con sesión iniciada aunque el
// onboarding esté a medias: se llega ahí desde el enlace de recuperación.
const RUTAS_SIEMPRE_DISPONIBLES = ["/cambiar-clave"];

// El enlace público del perfil (`/p/[token]`) y las Normas de la Comunidad (`/normas`) se
// sirven igual con o sin sesión: a diferencia de `RUTAS_PUBLICAS`, acá un usuario logueado
// NO se rebota a `/` — hace falta poder abrir `/normas` desde el gate de `/aceptar-normas`
// sin salir de esa pantalla. «Apoyar» (`/apoyar`) también: la enlaza la portada y la declaran
// pública `robots.ts` y `sitemap.ts`, pero faltaba acá y a quien no tenía sesión lo mandaba a
// `/ingresar` (#226). Política de Privacidad y Términos, igual: se enlazan desde el alta (#352).
const RUTAS_ABIERTAS = ["/p/", "/normas", "/apoyar", "/privacidad", "/terminos"];

/** Solo destinos internos: `next` viaja por la URL y no puede convertirse en un redirect abierto. */
function conNext(destino: string, next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next === "/") return destino;
  return `${destino}?next=${encodeURIComponent(next)}`;
}

export async function actualizarSesion(
  request: NextRequest,
): Promise<{ respuesta: NextResponse; userId: string | null }> {
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

  // #237: la sesión se valida acá mismo con la clave pública del proyecto (el token es un JWT
  // ES256; las claves se bajan una vez y quedan en caché) en vez de preguntarle a Supabase
  // Auth en cada navegación. El middleware corre en el borde, cerca de la persona, y ese
  // viaje hasta la base en Oregon era ~180 ms. `getClaims` renueva el token si venció, igual
  // que `getUser`. Lo único que cambia: un logout en otro dispositivo se nota acá cuando vence
  // el token (≤ 1 h) y no al instante; las páginas y la base siguen validando por su cuenta.
  const { data: sesion } = await supabase.auth.getClaims();
  const userId = sesion?.claims?.sub ?? null;

  const path = request.nextUrl.pathname;
  // `/en/normas` es la misma página que `/normas`, en inglés (#237): las reglas de acceso
  // miran la ruta sin el prefijo de idioma.
  const ruta = separarIdioma(path).resto;
  const esRutaPublica = RUTAS_PUBLICAS.some((r) => ruta.startsWith(r));
  const esRutaAbierta = RUTAS_ABIERTAS.some((r) => ruta.startsWith(r));

  // `destino` puede traer query (`conNext`): separarla es necesario porque `url.pathname`
  // no acepta un `?` adentro.
  const redirigir = (destino: string) => {
    const [pathname, search] = destino.split("?");
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return { respuesta: NextResponse.redirect(url), userId };
  };
  const seguir = () => ({ respuesta: response, userId });

  if (esRutaAbierta) return seguir();

  if (!userId) {
    // La raíz para un anónimo sirve la portada ahí mismo, con 200 y no un redirect, para
    // que `/` sea indexable: el rewrite a la portada en su idioma lo hace `src/middleware.ts`.
    if (path === "/") return seguir();
    if (esRutaPublica) return seguir();
    return redirigir("/ingresar");
  }

  if (esRutaPublica) return redirigir("/");

  if (RUTAS_SIEMPRE_DISPONIBLES.some((r) => path.startsWith(r))) return seguir();

  const estado = await leerEstadoCuenta(supabase, userId);
  const destino = destinoSegunEstado(estado);

  const enAltaPerfil = path.startsWith("/completar-perfil");
  const enSolicitudPendiente = path.startsWith("/solicitud-pendiente");
  const enAceptarNormas = path.startsWith("/aceptar-normas");

  if (destino === "solicitud-pendiente") {
    return enSolicitudPendiente ? seguir() : redirigir(conNext("/solicitud-pendiente", path));
  }

  if (destino === "aceptar-normas") {
    return enAceptarNormas ? seguir() : redirigir(conNext("/aceptar-normas", path));
  }

  if (destino === "completar-perfil") {
    return enAltaPerfil ? seguir() : redirigir(conNext("/completar-perfil", path));
  }

  // Onboarding terminado: esas pantallas ya no aplican.
  if (enAltaPerfil || enSolicitudPendiente || enAceptarNormas) return redirigir("/");

  return seguir();
}
