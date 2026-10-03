"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

type Resultado =
  | { ok: true; storage_path: string; url: string }
  | { ok: false; error: string };

/** La foto de la cuenta de Google, si entró con Google: solo de los servidores de Google. */
export async function fotoDeGoogle(metadata: Record<string, unknown> | undefined): Promise<string | null> {
  const valor = metadata?.avatar_url ?? metadata?.picture;
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return null;
    // Google la sirve chiquita (`=s96-c`): se pide en un tamaño que sirva para el portfolio.
    return url.toString().replace(/=s\d+(-c)?$/, "=s1000");
  } catch {
    return null;
  }
}

/**
 * «Usar mi foto de Google» en el alta (#303): la baja del lado del servidor (sin depender de
 * CORS) y la sube a Storage como cualquier foto del portfolio. Queda pendiente igual que las
 * demás del alta: la fila en `fotos_talento` se crea al completar el perfil.
 */
export async function importarFotoDeGoogle(): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const origen = await fotoDeGoogle(user.user_metadata);
  if (!origen) return { ok: false, error: "Tu cuenta de Google no tiene foto." };

  let imagen: Blob;
  try {
    const r = await fetch(origen, { signal: AbortSignal.timeout(10_000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) throw new Error(`HTTP ${r.status} ${tipo}`);
    imagen = await r.blob();
    if (imagen.size > 5 * 1024 * 1024) throw new Error("demasiado grande");
  } catch {
    return { ok: false, error: "No pudimos traer tu foto de Google. Subila desde el celular." };
  }

  const extension = imagen.type.includes("png") ? "png" : imagen.type.includes("webp") ? "webp" : "jpg";
  const ruta = `${user.id}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("fotos-perfil")
    .upload(ruta, imagen, { contentType: imagen.type });
  if (error) {
    Sentry.captureException(error, { extra: { accion: "importar foto de Google" } });
    return { ok: false, error: "No pudimos guardar la foto. Probá de nuevo." };
  }
  return {
    ok: true,
    storage_path: ruta,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl,
  };
}
