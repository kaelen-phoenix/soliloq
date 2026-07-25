import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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

  if (!user) {
    if (!esRutaPublica) {
      const url = request.nextUrl.clone();
      url.pathname = "/ingresar";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, onboarding_completo")
    .eq("id", user.id)
    .maybeSingle();

  const enRol = path.startsWith("/elegir-rol");
  const enAltaPerfil = path.startsWith("/completar-perfil");

  if (!perfil?.rol) {
    if (!enRol) {
      const url = request.nextUrl.clone();
      url.pathname = "/elegir-rol";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (enRol) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!perfil.onboarding_completo) {
    if (!enAltaPerfil) {
      const url = request.nextUrl.clone();
      url.pathname = "/completar-perfil";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (enAltaPerfil) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
