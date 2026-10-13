import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { BUCKET_FOTOS, MAX_BYTES_FOTO } from "@/lib/perfil-talento";
import type { Database } from "@/lib/supabase/types";
import { fotoDeGoogle } from "@/lib/foto-google";

export { fotoDeGoogle };

/** La clave del error en `perfil.completar.errores`: el texto lo pone quien lo muestra. */
export type ErrorFotoGoogle = "sinFoto" | "noSeTrajo" | "noSeGuardo";

export type ResultadoFotoGoogle =
  | { ok: true; storage_path: string; url: string }
  | { ok: false; error: ErrorFotoGoogle };

/**
 * «Usar mi foto de Google» en el alta (#303): la baja del lado del servidor (sin depender de
 * CORS) y la sube a Storage como cualquier foto del portfolio. Queda pendiente igual que las
 * demás del alta: la fila en `fotos_talento` se crea al completar el perfil. Lo usan la web
 * (`completar-perfil/acciones.ts`) y la app nativa (`/api/app/foto-google`).
 */
export async function importarFotoDeGoogleDe(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<ResultadoFotoGoogle> {
  const origen = fotoDeGoogle(user.user_metadata);
  if (!origen) return { ok: false, error: "sinFoto" };

  let imagen: Blob;
  try {
    // Sin seguir redirecciones: solo se baja de la URL de Google ya validada.
    const r = await fetch(origen, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) throw new Error(`HTTP ${r.status} ${tipo}`);
    if (Number(r.headers.get("content-length") ?? 0) > MAX_BYTES_FOTO) throw new Error("demasiado grande");
    // Se lee cortando al pasar el tope, aunque el servidor no haya mandado el largo.
    const partes: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    const lector = r.body!.getReader();
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES_FOTO) {
        await lector.cancel();
        throw new Error("demasiado grande");
      }
      partes.push(value as Uint8Array<ArrayBuffer>);
    }
    imagen = new Blob(partes, { type: tipo });
  } catch {
    return { ok: false, error: "noSeTrajo" };
  }

  const extension = imagen.type.includes("png") ? "png" : imagen.type.includes("webp") ? "webp" : "jpg";
  const ruta = `${user.id}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, imagen, { contentType: imagen.type });
  if (error) {
    Sentry.captureException(error, { extra: { accion: "importar foto de Google" } });
    return { ok: false, error: "noSeGuardo" };
  }
  return {
    ok: true,
    storage_path: ruta,
    url: supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl,
  };
}
