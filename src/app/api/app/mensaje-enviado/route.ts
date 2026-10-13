import { NextResponse } from "next/server";
import { notificarMensajeNuevoDe } from "@/lib/push-servidor";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

/**
 * La app nativa avisa que mandó un mensaje (#394): push a los demás integrantes de la sala,
 * con los mismos controles que la web (`notificarMensajeNuevoDe`: el mensaje tiene que ser
 * real, de quien llama y recién enviado; respeta los bloqueos). Nunca falla de forma visible.
 */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  const c = (await request.json().catch(() => null)) as { mensajeId?: unknown } | null;
  if (typeof c?.mensajeId === "string" && c.mensajeId.length <= 64) {
    await notificarMensajeNuevoDe(sesion, c.mensajeId).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
