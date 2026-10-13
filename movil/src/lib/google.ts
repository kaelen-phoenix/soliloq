import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

/** `<esquema>://auth/callback`: Supabase lo tiene en las URL permitidas. */
export const CALLBACK = Linking.createURL("auth/callback");

// En Android la vuelta de Google llega por dos lados a la vez: a `openAuthSessionAsync` y como
// enlace a la ruta `auth/callback`. Cada código se canjea una sola vez: dos canjes simultáneos
// del mismo código dejaban trabado el cliente de Supabase y la app no cargaba nada más.
const canjes = new Map<string, Promise<string | null>>();

/** Canjea el `?code=` con el que vuelve Google (PKCE). Devuelve el código de error, si hubo. */
export function canjearCallback(url: string): Promise<string | null> {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  if (!code) return Promise.resolve(typeof queryParams?.error_code === "string" ? queryParams.error_code : "generico");
  if (!canjes.has(code)) {
    canjes.set(
      code,
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => (error ? (error.code ?? "generico") : null))
        .catch(() => "generico"),
    );
  }
  return canjes.get(code)!;
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
