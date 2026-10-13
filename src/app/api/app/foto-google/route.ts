import { NextResponse } from "next/server";
import { importarFotoDeGoogleDe } from "@/lib/foto-google-servidor";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

/** «Usar mi foto de Google» en el alta, desde la app nativa (#392). */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  return NextResponse.json(await importarFotoDeGoogleDe(sesion.supabase, sesion.user));
}
