import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { discordConfigurado } from "@/lib/discord-servidor";
import { destinoVuelta, redirectDiscord, SITIO } from "../comun";

/**
 * «Vincular mi Discord» (#269): manda a la pantalla de permiso de Discord. El `state` va en
 * una cookie httpOnly y se compara a la vuelta, para que nadie pueda completar la
 * vinculación de otra persona con un link armado. Desde un chat llega `?volver=/salas/…`
 * (#296): se guarda igual, en cookie, y la vuelta termina ahí.
 */
export async function GET(req: NextRequest) {
  const sitio = SITIO;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${sitio}/ingresar`);
  if (!discordConfigurado()) return NextResponse.redirect(`${sitio}/perfil?discord=no-configurado`);

  const estado = randomUUID();
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectDiscord());
  url.searchParams.set("response_type", "code");
  // identify: quién es. guilds.join: sumarla al servidor de Yalope sin link de invitación.
  url.searchParams.set("scope", "identify guilds.join");
  url.searchParams.set("state", estado);
  url.searchParams.set("prompt", "consent");

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("discord_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/discord",
    maxAge: 600,
  });
  const volver = destinoVuelta(req.nextUrl.searchParams.get("volver"));
  if (volver) {
    res.cookies.set("discord_volver", volver, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/discord",
      maxAge: 600,
    });
  }
  return res;
}
