import { supabase } from "./supabase";
import { URL_WEB } from "./web";

/**
 * Lo que la app no puede hacer directo contra la base (mails, borrar la cuenta, servicios con
 * claves privadas) lo hace la web en `/api/app/<ruta>` (#392), con la sesión de la app.
 */
export async function llamarApi<T extends object = object>(
  ruta: string,
  cuerpo?: unknown,
): Promise<({ ok: true } & T) | { ok: false; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "sinSesion" };
  try {
    const r = await fetch(`${URL_WEB}/api/app/${ruta}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const json = await r.json().catch(() => null);
    return json && typeof json === "object" && "ok" in json ? json : { ok: false };
  } catch {
    // Sin conexión o la web no respondió.
    return { ok: false, error: "red" };
  }
}
