import { NextResponse } from "next/server";
import { discordConfigurado, urlCanal } from "@/lib/discord-servidor";
import { desvincularmeDe } from "@/lib/salas-servidor";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

/**
 * Los chats desde la app nativa (#394), lo que necesita el servidor:
 *   { accion: "desvincularme", salaId }  → { ok } | { ok: false, error }  (clave de `chats.acciones`)
 *   { accion: "discord", salaId }        → { ok, configurado, url }  (el espacio de Discord de la sala)
 */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  const c = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const salaId = typeof c.salaId === "string" && c.salaId.length <= 64 ? c.salaId : null;
  if (!salaId) return NextResponse.json({ ok: false, error: "pedido" }, { status: 400 });

  if (c.accion === "desvincularme") return NextResponse.json(await desvincularmeDe(sesion, salaId));

  if (c.accion === "discord") {
    // RLS: solo un integrante ve la sala.
    const { data: sala } = await sesion.supabase
      .from("salas")
      .select("discord_canal_id")
      .eq("id", salaId)
      .maybeSingle();
    if (!sala) return NextResponse.json({ ok: false, error: "pedido" }, { status: 404 });
    const configurado = discordConfigurado();
    return NextResponse.json({
      ok: true,
      configurado,
      url: configurado && sala.discord_canal_id ? urlCanal(sala.discord_canal_id) : null,
    });
  }
  return NextResponse.json({ ok: false, error: "pedido" }, { status: 400 });
}
