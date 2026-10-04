import * as Sentry from "@sentry/nextjs";
import { getVercelOidcToken } from "@vercel/oidc";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

/**
 * Lo común de las funciones de IA (#313 y siguientes): el tope de usos de la base y la
 * llamada al modelo por Vercel AI Gateway, autenticada con el OIDC del proyecto.
 */

// El plan gratis de AI Gateway no incluye Anthropic (#315): gpt-4.1-mini entra en el crédito
// gratis y redacta bien. Con crédito pago se puede cambiar por IA_MODELO (p. ej. Claude Haiku).
const MODELO = process.env.IA_MODELO ?? "openai/gpt-4.1-mini";

/** Anota un uso (0100). Devuelve el mensaje para la persona si no se puede, o `null`. */
export async function consumirUsoIa(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { error } = await supabase.rpc("consumir_uso_ia");
  if (!error) return null;
  if (error.message?.includes("limite_ia")) {
    return "Llegaste al máximo de usos de IA de las últimas 24 horas. Probá más tarde.";
  }
  Sentry.captureException(error, { extra: { accion: "consumir_uso_ia" } });
  return "No pudimos hacerlo ahora. Probá de nuevo.";
}

/** Si la llamada al modelo falló, el uso no cuenta (#343): se devuelve. */
export async function devolverUsoIa(supabase: SupabaseClient<Database>) {
  await supabase.rpc("devolver_uso_ia");
}

/** Saca las etiquetas del bloque para que nadie lo cierre y siga con instrucciones propias. */
export function enBloque(etiqueta: string, contenido: string) {
  const limpio = contenido.replace(new RegExp(`<\\/?\\s*${etiqueta}\\s*>`, "gi"), "");
  return `<${etiqueta}>\n${limpio}\n</${etiqueta}>`;
}

/** Una respuesta del modelo. Tira si falla: quien llama decide qué ve la persona. */
export async function llamarModelo({
  sistema,
  usuario,
  maxTokens = 1200,
  json = false,
}: {
  sistema: string;
  usuario: string;
  maxTokens?: number;
  /** Pide un objeto JSON como respuesta. */
  json?: boolean;
}): Promise<string> {
  const token = process.env.AI_GATEWAY_API_KEY ?? (await getVercelOidcToken());
  const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: maxTokens,
      temperature: 0,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`AI Gateway ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const datos = await r.json();
  const salida = String(datos?.choices?.[0]?.message?.content ?? "").trim();
  if (!salida) throw new Error("respuesta vacía");
  return salida;
}

/** El JSON de una respuesta, o `{}` si no es un objeto (el modelo puede devolver cualquier cosa). */
export function objetoJson(crudo: string): Record<string, unknown> {
  try {
    const v = JSON.parse(crudo);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
