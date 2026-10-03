"use server";

import * as Sentry from "@sentry/nextjs";
import { getVercelOidcToken } from "@vercel/oidc";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true; texto: string } | { ok: false; error: string };

const MODELO = "anthropic/claude-haiku-4.5";
const MAX_ENTRADA = 4000;
const MAX_SALIDA = 2000;

const INSTRUCCIONES = `Sos editor de currículums artísticos para Yalope, una plataforma de casting de teatro y audiovisual en Argentina.
Te pasan el texto que una persona escribió o pegó sobre su experiencia (formación, obras, roles, cursos). Devolvé ese mismo contenido bien redactado, para un perfil profesional:
- Español rioplatense neutro y profesional, en primera persona si el original está en primera persona.
- No inventes nada: ni obras, ni fechas, ni roles, ni maestros que no estén en el texto. Si algo no se entiende, dejalo afuera.
- Ordená: primero formación, después experiencia (lo más reciente primero, si hay fechas), después otros datos.
- Podés usar líneas separadas por tema; sin markdown, sin asteriscos, sin títulos con #.
- Máximo ${MAX_SALIDA} caracteres.
- Devolvé solo el texto final, sin comentarios ni introducciones.`;

/**
 * «✨ Mejorar redacción» de la Experiencia (#313). Claude Haiku por Vercel AI Gateway,
 * autenticado con el OIDC del proyecto (sin clave). Cada uso pasa antes por el tope de
 * `consumir_uso_ia()` (0100). La persona ve el resultado y elige si lo usa.
 */
export async function mejorarRedaccion(texto: string): Promise<Resultado> {
  const entrada = texto.trim();
  if (entrada.length < 20) return { ok: false, error: "Escribí o pegá un poco más de texto primero." };
  if (entrada.length > MAX_ENTRADA) {
    return { ok: false, error: `El texto es muy largo (máximo ${MAX_ENTRADA} caracteres).` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error: errorTope } = await supabase.rpc("consumir_uso_ia");
  if (errorTope) {
    if (errorTope.message?.includes("limite_ia")) {
      return { ok: false, error: "Llegaste al máximo de mejoras por hoy. Probá mañana." };
    }
    Sentry.captureException(errorTope, { extra: { accion: "consumir_uso_ia" } });
    return { ok: false, error: "No pudimos mejorarlo ahora. Probá de nuevo." };
  }

  try {
    const token = process.env.AI_GATEWAY_API_KEY ?? (await getVercelOidcToken());
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: entrada },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`AI Gateway ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const datos = await r.json();
    const salida = String(datos?.choices?.[0]?.message?.content ?? "").trim().slice(0, MAX_SALIDA);
    if (!salida) throw new Error("respuesta vacía");
    return { ok: true, texto: salida };
  } catch (e) {
    Sentry.captureException(e, { extra: { accion: "mejorar redacción" } });
    return { ok: false, error: "No pudimos mejorarlo ahora. Probá de nuevo en un rato." };
  }
}
