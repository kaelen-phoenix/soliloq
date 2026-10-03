import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarEspaciosDe, sumarAlServidor } from "@/lib/discord-servidor";
import { destinoVuelta, redirectDiscord, SITIO } from "../comun";

/**
 * Vuelta de Discord (#269): verifica el `state`, cambia el código por un token, lee quién es
 * la persona en Discord, guarda la vinculación (solo el servidor puede escribirla, 0094), la
 * suma al servidor de Yalope y la mete en los espacios de las salas donde ya está.
 */
export async function GET(req: NextRequest) {
  const sitio = SITIO;
  // Bien vinculado, vuelve al chat de donde salió (#296); los errores se explican en Perfil.
  const chat = destinoVuelta(req.cookies.get("discord_volver")?.value);
  const volver = (resultado: string) => {
    const destino =
      resultado === "vinculado" && chat ? `${sitio}${chat}` : `${sitio}/perfil?discord=${resultado}`;
    const res = NextResponse.redirect(destino);
    res.cookies.delete({ name: "discord_estado", path: "/api/discord" });
    res.cookies.delete({ name: "discord_volver", path: "/api/discord" });
    return res;
  };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${sitio}/ingresar`);

  const codigo = req.nextUrl.searchParams.get("code");
  const estado = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error")) return volver("cancelado");
  if (!codigo || !estado || estado !== req.cookies.get("discord_estado")?.value) return volver("error");

  try {
    const token = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: codigo,
        redirect_uri: redirectDiscord(),
      }),
      cache: "no-store",
    });
    if (!token.ok) return volver("error");
    const { access_token } = (await token.json()) as { access_token: string };

    const yo = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });
    if (!yo.ok) return volver("error");
    const discord = (await yo.json()) as { id: string; username: string; global_name?: string | null };

    // Primero al servidor: si Discord no la deja entrar, no queda una vinculación a medias.
    if (!(await sumarAlServidor(discord.id, access_token))) return volver("error");

    const admin = createAdminClient();
    const { error } = await admin
      .from("perfiles")
      .update({ discord_user_id: discord.id, discord_usuario: discord.username })
      .eq("id", user.id);
    // 23505: esa cuenta de Discord ya está vinculada a otra cuenta de Yalope.
    if (error) return volver(error.code === "23505" ? "en-uso" : "error");

    await sincronizarEspaciosDe(user.id);
    return volver("vinculado");
  } catch (e) {
    Sentry.captureException(e, { tags: { origen: "discord" } });
    return volver("error");
  }
}
