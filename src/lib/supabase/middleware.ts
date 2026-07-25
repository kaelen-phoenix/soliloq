import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSegunEstado } from "../cuenta";
import { leerEstadoCuenta } from "../cuenta-servidor";
import type { Database } from "./types";

const RUTAS_PUBLICAS = ["/ingresar", "/auth/callback"];

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

  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    return NextResponse.redirect(url);
  };

  if (!user) {
    return esRutaPublica ? response : redirigir("/ingresar");
  }

  if (esRutaPublica) return redirigir("/");

  const estado = await leerEstadoCuenta(supabase, user.id);
  const destino = destinoSegunEstado(estado);

  const enRol = path.startsWith("/elegir-rol");
  const enAltaPerfil = path.startsWith("/completar-perfil");
  // Alta del segundo perfil: solo tiene sentido con el onboarding ya resuelto.
  const enPerfilNuevo = path.startsWith("/perfil/nuevo");

  if (destino === "elegir-rol") {
    return enRol ? response : redirigir("/elegir-rol");
  }

  if (destino === "completar-perfil") {
    // Se permite volver a /elegir-rol para corregir mientras no exista ningún perfil.
    return enRol || enAltaPerfil ? response : redirigir("/completar-perfil");
  }

  // Con al menos un perfil creado, el onboarding terminó: esas pantallas ya no aplican.
  if (enRol || enAltaPerfil) return redirigir("/");

  // El alta del segundo perfil es válida solo si falta alguno.
  if (enPerfilNuevo && estado.tieneAmbosPerfiles) return redirigir("/perfil");

  return response;
}
