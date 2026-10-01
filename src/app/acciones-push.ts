"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportarErrorSupabase } from "@/lib/observabilidad";

const VAPID_LISTO =
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_SUBJECT;

if (VAPID_LISTO) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

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
 * Avisa por push a los demás integrantes de la sala de que hay un mensaje nuevo. La llama
 * el cliente después de insertar el mensaje, pasando su `id`.
 *
 * Re-lee el mensaje de la base (RLS: solo salas propias) y verifica que sea del propio
 * usuario y reciente, así nadie puede disparar notificaciones con texto arbitrario sin un
 * mensaje real detrás. No falla nunca de forma visible: el chat ya se mandó bien.
 */
export async function notificarMensajeNuevo(mensajeId: string) {
  if (!VAPID_LISTO) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: mensaje } = await supabase
    .from("mensajes")
    .select("sala_id, contenido, autor_id, creado_en")
    .eq("id", mensajeId)
    .maybeSingle();
  // Tiene que ser un mensaje real, del que llama, y recién enviado.
  if (!mensaje || mensaje.autor_id !== user.id) return;
  if (Date.now() - new Date(mensaje.creado_en).getTime() > 30_000) return;

  const salaId = mensaje.sala_id;
  const contenido = mensaje.contenido;

  const { data: sala } = await supabase
    .from("salas")
    .select("titulo, obras(titulo)")
    .eq("id", salaId)
    .maybeSingle();
  if (!sala) return;
  const obra = (Array.isArray(sala.obras) ? sala.obras[0] : sala.obras) as { titulo: string } | null;
  const tituloSala = obra?.titulo ?? sala.titulo ?? "Yalope";

  const { data: talento } = await supabase
    .from("perfiles_talento")
    .select("nombre")
    .eq("id", user.id)
    .maybeSingle();
  const remitente = talento?.nombre ?? "Alguien";

  const { data: integrantes } = await supabase
    .from("sala_integrantes")
    .select("perfil_id")
    .eq("sala_id", salaId)
    .neq("perfil_id", user.id);
  if (!integrantes || integrantes.length === 0) return;

  // `hay_bloqueo` mira el par (auth.uid(), p_otro_perfil) con el uid de quien llama —acá,
  // quien escribió el mensaje—, así que un bloqueo en cualquiera de los dos sentidos corta
  // el push igual que ya corta la visibilidad del chat (0022/0023).
  const destinatarios: string[] = [];
  for (const i of integrantes) {
    const { data: bloqueado, error: errorBloqueo } = await supabase.rpc("hay_bloqueo", {
      p_otro_perfil: i.perfil_id,
    });
    if (errorBloqueo) {
      // Si `hay_bloqueo` falla, no hay forma de saber si el push está bloqueado — mejor no
      // mandarlo (favor de la privacidad) y que quede reportado.
      reportarErrorSupabase(errorBloqueo, { rpc: "hay_bloqueo", userId: user.id, salaId });
      continue;
    }
    if (!bloqueado) destinatarios.push(i.perfil_id);
  }
  if (destinatarios.length === 0) return;

  await enviarPush(destinatarios, {
    title: `${remitente} — ${tituloSala}`,
    body: contenido.length > 140 ? `${contenido.slice(0, 140)}…` : contenido,
    url: `/salas/${salaId}`,
    tag: `sala-${salaId}`,
  });
}

interface AvisoPush {
  title: string;
  body: string;
  /** A dónde lleva el toque en la notificación (lo abre `sw.js`). */
  url: string;
  /** Mismo `tag` = el aviso nuevo reemplaza al anterior en vez de apilarse. */
  tag: string;
}

/**
 * Manda un push a todos los dispositivos de esas cuentas. Con la clave de servicio: quien
 * llama ya decidió que el aviso corresponde. Las suscripciones muertas (404/410) se borran.
 */
async function enviarPush(perfilIds: string[], aviso: AvisoPush) {
  const admin = createAdminClient();
  const { data: suscripciones } = await admin
    .from("push_suscripciones")
    .select("id, endpoint, p256dh, auth")
    .in("perfil_id", perfilIds);
  if (!suscripciones || suscripciones.length === 0) return;

  const payload = JSON.stringify(aviso);

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (err) {
        // 404/410: el navegador o el usuario dieron de baja la suscripción de su lado
        // (desinstaló, borró datos, revocó el permiso). Se limpia para no seguir
        // reintentando contra un endpoint muerto.
        const codigo = (err as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          await admin.from("push_suscripciones").delete().eq("id", s.id);
        }
      }
    })
  );
}

/**
 * Los avisos de acceso por push (#247, #248, 0092). La base ya creó la notificación de la
 * campanita (`solicitud_acceso` a cada admin, `acceso_habilitado` a la persona); esto manda
 * el push de las que todavía no lo tienen. Se llama desde `/solicitud-pendiente` (después
 * de pedir acceso) y desde el panel de admin (después de aprobar o invitar).
 *
 * Cada aviso se «reclama» marcando `push_enviado_en` en el mismo `update` que lo lee, así
 * dos llamadas a la vez no lo mandan dos veces. Solo mira las últimas 24 h: un aviso viejo
 * que no salió (p. ej. sin VAPID) ya no tiene sentido como push; en la campanita sigue.
 * No hace nada que no corresponda aunque cualquiera lo llame: solo despacha avisos que la
 * base ya decidió.
 */
export async function despacharAvisosDeAcceso() {
  if (!VAPID_LISTO) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const { data: avisos, error } = await admin
    .from("notificaciones")
    .update({ push_enviado_en: new Date().toISOString() })
    .in("tipo", ["solicitud_acceso", "acceso_habilitado"])
    .is("push_enviado_en", null)
    .gte("creado_en", new Date(Date.now() - 24 * 3600_000).toISOString())
    .select("destinatario_id, tipo, de_perfil");
  if (error) {
    reportarErrorSupabase(error, { accion: "despacharAvisosDeAcceso" });
    return;
  }
  if (!avisos || avisos.length === 0) return;

  await Promise.all(
    avisos.map(async (a) => {
      if (a.tipo === "acceso_habilitado") {
        await enviarPush([a.destinatario_id], {
          title: "¡Ya tenés acceso a Yalope!",
          body: "Tu solicitud fue aprobada. Entrá y completá tu perfil.",
          url: "/",
          tag: "acceso-habilitado",
        });
        return;
      }
      // Solicitud: a los admins les sirve saber quién es, y lo único que hay es el email.
      const { data: solicitante } = a.de_perfil
        ? await admin.auth.admin.getUserById(a.de_perfil)
        : { data: null };
      const email = solicitante?.user?.email;
      await enviarPush([a.destinatario_id], {
        title: "Nueva solicitud de acceso",
        body: email ? `${email} pidió entrar a Yalope.` : "Alguien pidió entrar a Yalope.",
        url: "/admin",
        tag: `solicitud-${a.de_perfil ?? "acceso"}`,
      });
    })
  );
}
