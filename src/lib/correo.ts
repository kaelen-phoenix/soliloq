/**
 * Envío de mails desde la web (#272), por la API de Resend. Sin SDK: es un `POST`.
 *
 * Remitente: `info@yalope.com` (el dominio se verifica en Resend con registros DNS en
 * Vercel). Sin `RESEND_API_KEY` no hay envío y se avisa con `omitido`: así el código puede
 * estar antes que la cuenta, y en local y en CI nunca sale un mail.
 */
const REMITENTE = "Yalope <info@yalope.com>";
const RESPONDER_A = "info@yalope.com";

export type ResultadoCorreo = { ok: true } | { ok: false; omitido: true } | { ok: false; error: string };

export function correoConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function enviarCorreo(mail: {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}): Promise<ResultadoCorreo> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return { ok: false, omitido: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: REMITENTE,
        to: [mail.para],
        reply_to: RESPONDER_A,
        subject: mail.asunto,
        html: mail.html,
        text: mail.texto,
      }),
      // Un proveedor lento no puede colgar a quien llama.
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar." };
  }
}
