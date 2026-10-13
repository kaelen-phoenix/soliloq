"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { despacharMailsDeAcceso } from "@/lib/avisos-mail-servidor";
import { textosCorreo } from "@/lib/correos/textos";
import { enviarPush, notificarMensajeNuevoDe, VAPID_LISTO } from "@/lib/push-servidor";

interface SuscripcionPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Guarda (o renueva) la suscripción push del dispositivo actual. */
export async function guardarSuscripcionPush(sub: SuscripcionPush) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_suscripciones")
    .upsert(
      { perfil_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" }
    );
}

/** Da de baja la suscripción del dispositivo actual (botón "Desactivar"). */
export async function borrarSuscripcionPush(endpoint: string) {
  const supabase = createClient();
  await supabase.from("push_suscripciones").delete().eq("endpoint", endpoint);
}

/**
 * Avisa por push a los demás integrantes de la sala de que hay un mensaje nuevo (la lógica,
 * con sus controles, en `notificarMensajeNuevoDe`, compartida con la app nativa).
 */
export async function notificarMensajeNuevo(mensajeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await notificarMensajeNuevoDe({ supabase, user }, mensajeId);
}

/**
 * Los avisos de acceso por push (#247, #248, 0092). La base ya creó la notificación de la
 * campanita (`solicitud_acceso` a cada admin, `acceso_habilitado` a la persona); esto manda
 * el push de las que todavía no lo tienen. Se llama desde `/solicitud-pendiente` (después
 * de pedir acceso) y desde el panel de admin (después de aprobar o invitar).
 *
 * Cada aviso se «reclama» marcando `push_enviado_en` en el mismo `update` que lo lee, así
 * dos llamadas a la vez no lo mandan dos veces; si el envío falla por algo temporal, se
 * libera para que lo reintente la próxima llamada. Solo toma avisos sin leer (una solicitud
 * ya resuelta queda leída —0092—, y lo que se vio en la campanita no necesita push) y de las
 * últimas 24 h (un aviso viejo ya no tiene sentido como push; en la campanita sigue).
 * No hace nada que no corresponda aunque cualquiera lo llame: solo despacha avisos que la
 * base ya decidió.
 */
export async function despacharAvisosDeAcceso() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Push y mail (0093) en paralelo; cada canal con su marca y sus reintentos.
  await Promise.all([
    VAPID_LISTO ? despacharPushDeAcceso() : null,
    despacharMailsDeAcceso().catch((e) =>
      Sentry.captureException(e, { tags: { origen: "mail" }, extra: { accion: "despacharMailsDeAcceso" } }),
    ),
  ]);
}

async function despacharPushDeAcceso() {
  const admin = createAdminClient();
  const { data: avisos, error } = await admin
    .from("notificaciones")
    .update({ push_enviado_en: new Date().toISOString() })
    .in("tipo", ["solicitud_acceso", "acceso_habilitado"])
    .is("push_enviado_en", null)
    .is("leida_en", null)
    .gte("creado_en", new Date(Date.now() - 24 * 3600_000).toISOString())
    .select("id, destinatario_id, tipo, de_perfil");
  if (error) {
    reportarErrorSupabase(error, { accion: "despacharAvisosDeAcceso" });
    return;
  }
  if (!avisos || avisos.length === 0) return;

  await Promise.all(
    avisos.map(async (a) => {
      let enviado: boolean;
      if (a.tipo === "acceso_habilitado") {
        enviado = await enviarPush([a.destinatario_id], (idioma) => {
          const t = textosCorreo(idioma);
          return {
            title: t("push.accesoHabilitado.titulo"),
            body: t("push.accesoHabilitado.cuerpo"),
            url: "/",
            tag: "acceso-habilitado",
          };
        });
      } else {
        // Solicitud: a los admins les sirve saber quién es, y lo único que hay es el email.
        const { data: solicitante } = a.de_perfil
          ? await admin.auth.admin.getUserById(a.de_perfil)
          : { data: null };
        const email = solicitante?.user?.email;
        enviado = await enviarPush([a.destinatario_id], (idioma) => {
          const t = textosCorreo(idioma);
          return {
            title: t("push.solicitudAcceso.titulo"),
            body: email ? t("push.solicitudAcceso.cuerpo", { email }) : t("push.solicitudAcceso.cuerpoSinEmail"),
            url: "/admin",
            tag: `solicitud-${a.de_perfil ?? "acceso"}`,
          };
        });
      }
      // Falla temporal: se libera para que lo reintente la próxima llamada.
      if (!enviado) await admin.from("notificaciones").update({ push_enviado_en: null }).eq("id", a.id);
    })
  );
}
