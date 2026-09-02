import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { detectarIdioma } from "@/i18n/request";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  // Sólo destinos internos: el parámetro viaja por la URL del correo.
  const siguiente = searchParams.get("next");
  const destino = siguiente?.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/";

  const supabase = createClient();

  // Al confirmar la sesión (típicamente el primer ingreso), si todavía no hay una
  // preferencia de idioma se autodetecta por `Accept-Language` y se persiste.
  async function alinearIdioma(res: NextResponse) {
    if (request.headers.get("cookie")?.includes("NEXT_LOCALE=")) return res;
    const idioma = detectarIdioma(request.headers.get("accept-language"));
    res.cookies.set("NEXT_LOCALE", idioma, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("perfiles").update({ idioma }).eq("id", user.id);
    return res;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return alinearIdioma(NextResponse.redirect(`${origin}${destino}`));
  } else if (tokenHash && tipo) {
    // Enlaces de correo servidos con el formato de verificación por token.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) return alinearIdioma(NextResponse.redirect(`${origin}${destino}`));
  }

  // Enlace vencido, ya utilizado, o sin código: volvemos al ingreso con un aviso.
  return NextResponse.redirect(`${origin}/ingresar?error=enlace_invalido`);
}
