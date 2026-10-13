import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

/** `<esquema>://auth/callback`: Supabase lo tiene en las URL permitidas. */
export const CALLBACK = Linking.createURL("auth/callback");

/** Canjea el `?code=` con el que vuelve Google (PKCE). Devuelve el código de error, si hubo. */
export async function canjearCallback(url: string): Promise<string | null> {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  if (!code) return typeof queryParams?.error_code === "string" ? queryParams.error_code : "generico";
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? (error.code ?? "generico") : null;
}

/**
 * Ingresar con Google: se abre en el navegador del sistema (Google no deja hacerlo dentro de
 * la app) y vuelve por `CALLBACK`. `null` si entró, o si la persona cerró el navegador.
 */
export async function ingresarConGoogle(): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: CALLBACK,
      skipBrowserRedirect: true,
      // Que deje elegir otra cuenta de Google (#147).
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return error?.code ?? "generico";
  const resultado = await WebBrowser.openAuthSessionAsync(data.url, CALLBACK);
  if (resultado.type !== "success") return null;
  return canjearCallback(resultado.url);
}
