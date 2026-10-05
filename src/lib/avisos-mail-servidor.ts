import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { mailAccesoHabilitado, mailSolicitudAcceso } from "@/lib/correos/acceso";
import { idiomaDe } from "@/lib/correos/textos";

/**
 * Los avisos de acceso por mail (#247, #248, 0093), el mismo circuito que el push
 * (`despacharAvisosDeAcceso`) con su propia marca, `mail_enviado_en`: cada canal se despacha
 * y se reintenta por su lado.
 *
 * - `solicitud_acceso` → mail a cada admin, solo mientras la solicitud siga sin resolver
 *   (sin leer: al habilitar a la persona, 0092 la marca leída).
 * - `acceso_habilitado` → mail a la persona, aunque ya lo haya visto en la campanita: el mail
 *   es lo que le avisa si no tiene la app abierta.
 *
 * Cada mail sale en el idioma de quien lo recibe (`perfiles.idioma`, #354).
 *
 * Últimas 24 h, reserva atómica, y si el envío falla se libera para reintentar. Sin clave de
 * Resend no reclama nada.
 */
export async function despacharMailsDeAcceso() {
  if (!correoConfigurado()) return;
  const admin = createAdminClient();
  const desde = new Date(Date.now() - 24 * 3600_000).toISOString();
  const ahora = new Date().toISOString();

  const [solicitudes, habilitados] = await Promise.all([
    admin
      .from("notificaciones")
      .update({ mail_enviado_en: ahora })
      .eq("tipo", "solicitud_acceso")
      .is("mail_enviado_en", null)
      .is("leida_en", null)
      .gte("creado_en", desde)
      .select("id, destinatario_id, de_perfil, creado_en"),
    admin
      .from("notificaciones")
      .update({ mail_enviado_en: ahora })
      .eq("tipo", "acceso_habilitado")
      .is("mail_enviado_en", null)
      .gte("creado_en", desde)
      .select("id, destinatario_id, de_perfil, creado_en"),
  ]);

  const emailDe = async (id: string | null) =>
    id ? ((await admin.auth.admin.getUserById(id)).data?.user?.email ?? null) : null;

  const avisos = [
    ...(solicitudes.data ?? []).map((a) => ({ ...a, tipo: "solicitud_acceso" as const })),
    ...(habilitados.data ?? []).map((a) => ({ ...a, tipo: "acceso_habilitado" as const })),
  ];
  if (avisos.length === 0) return;

  // El idioma de cada destinatario, en una sola consulta. Si falla, castellano.
  const { data: idiomas } = await admin
    .from("perfiles")
    .select("id, idioma")
    .in("id", Array.from(new Set(avisos.map((a) => a.destinatario_id))));
  const idiomaPorPerfil = new Map((idiomas ?? []).map((p) => [p.id, idiomaDe(p.idioma)]));

  // De a uno: el plan gratis de Resend acepta ~2 envíos por segundo.
  for (const a of avisos) {
    // Sin email no hay a quién mandarle: queda marcado. Si algo falla (incluso una excepción
    // al buscar el email), se libera para reintentar.
    let liberar = false;
    try {
      const para = await emailDe(a.destinatario_id);
      if (para) {
        const idioma = idiomaPorPerfil.get(a.destinatario_id) ?? "es";
        const mail =
          a.tipo === "acceso_habilitado"
            ? mailAccesoHabilitado(idioma)
            : mailSolicitudAcceso({ email: await emailDe(a.de_perfil), fecha: new Date(a.creado_en), idioma });
        liberar = !(await enviarCorreo({ para, asunto: mail.asunto, html: mail.html, texto: mail.texto })).ok;
      }
    } catch {
      liberar = true;
    }
    if (liberar) {
      const { error } = await admin.from("notificaciones").update({ mail_enviado_en: null }).eq("id", a.id);
      if (error) {
        Sentry.captureException(new Error(`No se pudo liberar el mail de un aviso: ${error.message}`), {
          tags: { origen: "mail" },
          extra: { notificacionId: a.id },
        });
      }
    }
    if (avisos.length > 1) await new Promise((res) => setTimeout(res, 600));
  }
}
