import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  } else if (tokenHash && tipo) {
    // Enlaces de correo servidos con el formato de verificación por token.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  // Enlace vencido, ya utilizado, o sin código: volvemos al ingreso con un aviso.
  return NextResponse.redirect(`${origin}/ingresar?error=enlace_invalido`);
}
