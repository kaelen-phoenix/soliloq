import { NextResponse } from "next/server";
import { registrarNormasAceptadas } from "@/lib/normas-servidor";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

/** La app nativa acepta las Normas de la Comunidad (#392): lo mismo que `aceptarNormas`. */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  const r = await registrarNormasAceptadas(sesion.supabase, sesion.user.id);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
