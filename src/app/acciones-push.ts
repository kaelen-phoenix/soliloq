"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * el cliente después de insertar el mensaje (no hay server action de envío de chat: se
 * inserta directo con RLS, como el resto de la app — ver `sala-chat.tsx`).
 *
 * No falla nunca de forma visible: si VAPID no está configurado, si la sala no existe, o
 * si un envío puntual rebota, el chat en sí ya se mandó bien y no tiene por qué cortarse.
 */
export async function notificarMensajeNuevo(salaId: string, contenido: string) {
  if (!VAPID_LISTO) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sala } = await supabase
    .from("salas")
    .select("titulo, obras(titulo)")
    .eq("id", salaId)
    .maybeSingle();
  if (!sala) return;
  const obra = (Array.isArray(sala.obras) ? sala.obras[0] : sala.obras) as { titulo: string } | null;
  const tituloSala = obra?.titulo ?? sala.titulo ?? "Yalope";

  const [{ data: talento }, { data: creador }] = await Promise.all([
    supabase.from("perfiles_talento").select("nombre").eq("id", user.id).maybeSingle(),
    supabase.from("perfiles_creador").select("nombre").eq("id", user.id).maybeSingle(),
  ]);
  const remitente = talento?.nombre ?? creador?.nombre ?? "Alguien";

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
    const { data: bloqueado } = await supabase.rpc("hay_bloqueo", { p_otro_perfil: i.perfil_id });
    if (!bloqueado) destinatarios.push(i.perfil_id);
  }
  if (destinatarios.length === 0) return;

  const admin = createAdminClient();
  const { data: suscripciones } = await admin
    .from("push_suscripciones")
    .select("id, endpoint, p256dh, auth")
    .in("perfil_id", destinatarios);
  if (!suscripciones || suscripciones.length === 0) return;

  const payload = JSON.stringify({
    title: `${remitente} — ${tituloSala}`,
    body: contenido.length > 140 ? `${contenido.slice(0, 140)}…` : contenido,
    url: `/salas/${salaId}`,
    tag: `sala-${salaId}`,
  });

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
