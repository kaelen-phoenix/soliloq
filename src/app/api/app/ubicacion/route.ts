import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";
import { buscarLugares, lugarDesdeCoordenadas, resolverLugar } from "@/lib/ubicacion-servidor";

/**
 * El buscador de lugares de la app nativa (#392). Solo con sesión: es un servicio pago de
 * Google y no puede quedar abierto a cualquiera.
 *   { accion: "buscar", texto, sesion }   → { ok, sugerencias }
 *   { accion: "resolver", id, sesion }    → { ok, ubicacion }
 *   { accion: "coordenadas", lat, lng }   → { ok, ubicacion }
 */
export async function POST(request: Request) {
  if (!(await usuarioDesdeApp(request))) return sinSesion();
  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const idioma = cuerpo?.idioma === "en" ? "en" : "es";
  const sesion = typeof cuerpo?.sesion === "string" ? cuerpo.sesion.slice(0, 64) : "";
  try {
    if (cuerpo?.accion === "buscar" && typeof cuerpo.texto === "string") {
      return NextResponse.json({ ok: true, sugerencias: await buscarLugares(cuerpo.texto.slice(0, 200), sesion, idioma) });
    }
    if (cuerpo?.accion === "resolver" && typeof cuerpo.id === "string") {
      return NextResponse.json({ ok: true, ubicacion: await resolverLugar(cuerpo.id, sesion, idioma) });
    }
    if (cuerpo?.accion === "coordenadas") {
      return NextResponse.json({
        ok: true,
        ubicacion: await lugarDesdeCoordenadas(Number(cuerpo.lat), Number(cuerpo.lng), idioma),
      });
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { origen: "ubicacion-app" } });
    return NextResponse.json({ ok: false, error: "lugar" }, { status: 502 });
  }
  return NextResponse.json({ ok: false, error: "pedido" }, { status: 400 });
}
