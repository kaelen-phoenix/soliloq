import { createAdminClient } from "@/lib/supabase/admin";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { mailBienvenida } from "@/lib/correos/bienvenida";

export type ResumenBienvenidas = {
  enviados: number;
  fallidos: number;
  /** `true` si no hay `RESEND_API_KEY`: no se mandó ni se marcó nada. */
  sinCorreo: boolean;
};

/**
 * Manda el mail de bienvenida (#272) a quien ya puede entrar y todavía no lo recibió:
 * aprobada, no suspendida, `bienvenida_enviada_en` en null (0093).
 *
 * - `soloPerfil`: solo esa cuenta (al aceptar las Normas, que es cuando alguien nuevo ya
 *   puede entrar).
 * - sin `soloPerfil`: todas las que falten, hasta `limite` (el envío masivo del panel).
 *
 * Cada cuenta se reclama marcando `bienvenida_enviada_en` en el mismo `update` que la elige,
 * así dos llamadas a la vez no mandan dos mails; si el envío falla, se libera para reintentar.
 * Sin clave de Resend no reclama nada: el mail queda pendiente para cuando esté.
 */
export async function enviarBienvenidasPendientes(
  opciones: { soloPerfil?: string; limite?: number } = {},
): Promise<ResumenBienvenidas> {
  if (!correoConfigurado()) return { enviados: 0, fallidos: 0, sinCorreo: true };

  const admin = createAdminClient();
  let candidatas = admin
    .from("perfiles")
    .select("id")
    .not("aprobado_en", "is", null)
    .is("suspendido_en", null)
    .is("bienvenida_enviada_en", null)
    .limit(opciones.limite ?? 100);
  if (opciones.soloPerfil) candidatas = candidatas.eq("id", opciones.soloPerfil);
  const { data: filas, error } = await candidatas;
  if (error || !filas) return { enviados: 0, fallidos: filas ? 0 : 1, sinCorreo: false };

  const mail = mailBienvenida({ discord: process.env.NEXT_PUBLIC_DISCORD_INVITACION });
  let enviados = 0;
  let fallidos = 0;

  // De a una: el plan gratis de Resend acepta ~2 envíos por segundo.
  for (const { id } of filas) {
    const { data: reclamada } = await admin
      .from("perfiles")
      .update({ bienvenida_enviada_en: new Date().toISOString() })
      .eq("id", id)
      .is("bienvenida_enviada_en", null)
      .select("id")
      .maybeSingle();
    if (!reclamada) continue; // otra llamada ya la tomó

    const { data: usuario } = await admin.auth.admin.getUserById(id);
    const email = usuario?.user?.email;
    const resultado = email
      ? await enviarCorreo({ para: email, asunto: mail.asunto, html: mail.html, texto: mail.texto })
      : ({ ok: false, error: "sin email" } as const);

    if (resultado.ok) {
      enviados++;
    } else {
      fallidos++;
      await admin.from("perfiles").update({ bienvenida_enviada_en: null }).eq("id", id);
    }
    if (filas.length > 1) await new Promise((r) => setTimeout(r, 600));
  }

  return { enviados, fallidos, sinCorreo: false };
}
