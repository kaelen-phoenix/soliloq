import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "./types";

/**
 * Para los endpoints que llama la app nativa (#396, `src/app/api/app/…`). La app no tiene las
 * cookies de la web: manda su sesión en `Authorization: Bearer <access_token>`. Con eso se arma
 * un cliente que actúa como esa persona, así valen los mismos permisos (RLS) que en la web.
 *
 * Devuelve `null` si no hay sesión válida; el endpoint responde 401 con `sinSesion()`.
 */
export async function usuarioDesdeApp(
  request: Request,
): Promise<{ supabase: SupabaseClient<Database>; user: User } | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user ? { supabase, user } : null;
}

export const sinSesion = () => NextResponse.json({ ok: false, error: "sinSesion" }, { status: 401 });
