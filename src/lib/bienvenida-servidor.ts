import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { mailBienvenida } from "@/lib/correos/bienvenida";
import { idiomaDe } from "@/lib/correos/textos";

export type ResumenBienvenidas = {
  enviados: number;
  fallidos: number;
  /** `true` si no hay `RESEND_API_KEY`: no se mandó ni se marcó nada. */
  sinCorreo: boolean;
};

/**
 * Manda el mail de bienvenida (#272) a quien ya puede entrar y todavía no lo recibió:
 * aprobada, con las Normas aceptadas (el último paso antes de entrar), no suspendida, y
 * `bienvenida_enviada_en` en null (0093).
 *
 * - `soloPerfil`: solo esa cuenta (al aceptar las Normas, que es cuando alguien nuevo ya
 *   puede entrar).
 * - sin `soloPerfil`: todas las que falten, hasta `limite` (el envío masivo del panel).
 *
 * Cada cuenta se reclama marcando `bienvenida_enviada_en` en el mismo `update` que la elige,
 * así dos llamadas a la vez no mandan dos mails; si el envío falla, se libera para reintentar.
 * Sin clave de Resend no reclama nada: el mail queda pendiente para cuando esté. Cada mail
 * sale en el idioma de la cuenta (`perfiles.idioma`, #354).
 */
export async function enviarBienvenidasPendientes(
  opciones: { soloPerfil?: string; limite?: number } = {},
): Promise<ResumenBienvenidas> {
  if (!correoConfigurado()) return { enviados: 0, fallidos: 0, sinCorreo: true };

  const admin = createAdminClient();
  let candidatas = admin
    .from("perfiles")
    .select("id, idioma")
    .not("aprobado_en", "is", null)
    .not("normas_aceptadas_en", "is", null)
    .is("suspendido_en", null)
    .is("bienvenida_enviada_en", null)
    .limit(opciones.limite ?? 100);
  if (opciones.soloPerfil) candidatas = candidatas.eq("id", opciones.soloPerfil);
  const { data: filas, error } = await candidatas;
  if (error || !filas) return { enviados: 0, fallidos: filas ? 0 : 1, sinCorreo: false };

  const discord = process.env.NEXT_PUBLIC_DISCORD_INVITACION;
  const mails = {
    es: mailBienvenida({ discord, idioma: "es" }),
    en: mailBienvenida({ discord, idioma: "en" }),
  };
  let enviados = 0;
  let fallidos = 0;

  // De a una: el plan gratis de Resend acepta ~2 envíos por segundo.
  for (const { id, idioma } of filas) {
    const mail = mails[idiomaDe(idioma)];
    const { data: reclamada } = await admin
      .from("perfiles")
      .update({ bienvenida_enviada_en: new Date().toISOString() })
      .eq("id", id)
      .is("bienvenida_enviada_en", null)
      .select("id")
      .maybeSingle();
    if (!reclamada) continue; // otra llamada ya la tomó

    let enviado = false;
    try {
      const { data: usuario } = await admin.auth.admin.getUserById(id);
      const email = usuario?.user?.email;
      enviado = !!email && (await enviarCorreo({ para: email, asunto: mail.asunto, html: mail.html, texto: mail.texto })).ok;
    } catch {
      // `getUserById` puede tirar (red): se trata como envío fallido.
    }

    if (enviado) {
      enviados++;
    } else {
      fallidos++;
      // Se libera para reintentar. Si ni eso se puede, queda reportado: si no, esa cuenta no
      // recibiría nunca la bienvenida y nadie se enteraría.
      const { error: errorLiberar } = await admin.from("perfiles").update({ bienvenida_enviada_en: null }).eq("id", id);
      if (errorLiberar) {
        Sentry.captureException(new Error(`No se pudo liberar la bienvenida: ${errorLiberar.message}`), {
          tags: { origen: "mail" },
          extra: { perfilId: id },
        });
      }
    }
    if (filas.length > 1) await new Promise((r) => setTimeout(r, 600));
  }

  return { enviados, fallidos, sinCorreo: false };
}
