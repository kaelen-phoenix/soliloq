import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";
import { borrarUsuarioYArchivos } from "@/lib/supabase/borrar-usuario";

/** La app nativa borra la cuenta propia (#392): lo mismo que `borrarCuenta` de Ajustes. */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  try {
    await borrarUsuarioYArchivos(sesion.user.id);
  } catch (e) {
    Sentry.captureException(e, { tags: { origen: "borrar-cuenta-app" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
