import { createSign } from "node:crypto";

/**
 * Push a la app nativa por Firebase Cloud Messaging (#389): el único camino que tiene Android para
 * avisarle a una app cerrada. Se usa la API HTTP v1 con la cuenta de servicio del proyecto
 * (`FIREBASE_CUENTA_SERVICIO`, el JSON en base64, solo en el servidor). De Firebase se usa solo
 * esto: la base, el login y los datos siguen en Supabase.
 */

interface CuentaServicio {
  project_id: string;
  client_email: string;
  private_key: string;
}

function cuenta(): CuentaServicio | null {
  const crudo = process.env.FIREBASE_CUENTA_SERVICIO;
  if (!crudo) return null;
  try {
    return JSON.parse(Buffer.from(crudo, "base64").toString("utf8")) as CuentaServicio;
  } catch {
    return null;
  }
}

export const FCM_LISTO = !!cuenta();

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

// El token de acceso dura una hora: se reusa entre envíos mientras le queden 5 minutos.
let acceso: { token: string; vence: number } | null = null;

async function tokenDeAcceso(c: CuentaServicio): Promise<string> {
  if (acceso && acceso.vence - Date.now() > 5 * 60_000) return acceso.token;
  const ahora = Math.floor(Date.now() / 1000);
  const datos = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: c.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    }),
  )}`;
  const firma = createSign("RSA-SHA256").update(datos).sign(c.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${datos}.${b64url(firma)}`,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!r.ok) throw new Error(`FCM: no se obtuvo el token de acceso (${r.status})`);
  const { access_token, expires_in } = (await r.json()) as { access_token: string; expires_in: number };
  acceso = { token: access_token, vence: Date.now() + expires_in * 1000 };
  return access_token;
}

export interface AvisoFcm {
  title: string;
  body: string;
  /** A dónde lleva el toque: la ruta de la web; la app la traduce a su pantalla. */
  url: string;
  /** Mismo `tag` = el aviso nuevo reemplaza al anterior en vez de apilarse. */
  tag: string;
}

/**
 * Manda un aviso a un teléfono. `"muerto"` si el token ya no sirve (desinstaló la app o lo
 * renovó): quien llama lo borra. Tope de 5 s, como el push de la web.
 */
export async function enviarFcm(token: string, aviso: AvisoFcm): Promise<"ok" | "muerto" | "error"> {
  const c = cuenta();
  if (!c) return "error";
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await tokenDeAcceso(c)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: aviso.title, body: aviso.body },
          data: { url: aviso.url, tag: aviso.tag },
          android: { priority: "high", notification: { tag: aviso.tag, color: "#f2571e" } },
        },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (r.ok) return "ok";
    // UNREGISTERED (404) o un token que no es de este proyecto (400 INVALID_ARGUMENT).
    if (r.status === 404) return "muerto";
    if (r.status === 400) {
      const error = (await r.json().catch(() => null)) as { error?: { details?: { errorCode?: string }[] } } | null;
      if (error?.error?.details?.some((d) => d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT")) {
        return "muerto";
      }
    }
    return "error";
  } catch {
    return "error";
  }
}
