import webpush from "web-push";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { idiomaDe, textosCorreo } from "@/lib/correos/textos";
import type { Database } from "@/lib/supabase/types";
import type { Idioma } from "@/i18n/request";

/**
 * El envío de push, del lado del servidor: lo usan las server actions de la web
 * (`acciones-push.ts`) y los endpoints de la app nativa (`/api/app/…`).
 */
type Sesion = { supabase: SupabaseClient<Database>; user: User };

export const VAPID_LISTO =
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

/**
 * Avisa por push a los demás integrantes de la sala de que hay un mensaje nuevo. La llama
 * el cliente después de insertar el mensaje, pasando su `id`: la web por la server action
 * `notificarMensajeNuevo` y la app nativa por `/api/app/mensaje-enviado` (#394).
 *
 * Re-lee el mensaje de la base (RLS: solo salas propias) y verifica que sea del propio
 * usuario y reciente, así nadie puede disparar notificaciones con texto arbitrario sin un
 * mensaje real detrás. No falla nunca de forma visible: el chat ya se mandó bien.
 */
export async function notificarMensajeNuevoDe({ supabase, user }: Sesion, mensajeId: string) {
  if (!VAPID_LISTO) return;

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
  const remitente = talento?.nombre ?? null;

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

  await enviarPush(destinatarios, (idioma) => ({
    title: `${remitente ?? textosCorreo(idioma)("push.mensaje.alguien")} — ${tituloSala}`,
    body: contenido.length > 140 ? `${contenido.slice(0, 140)}…` : contenido,
    url: `/salas/${salaId}`,
    tag: `sala-${salaId}`,
  }));
}

export interface AvisoPush {
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
 * El aviso se arma por dispositivo, en el idioma de su cuenta (`perfiles.idioma`, #354).
 *
 * Devuelve `false` si hubo un error que vale reintentar (no se pudieron leer las
 * suscripciones, o un envío falló por otra cosa que una suscripción muerta); `true` si no
 * queda nada por hacer (entregado, o la cuenta no tiene notificaciones activadas). Cada envío
 * tiene un tope de 5 s: un servicio de push colgado no puede trabar a quien llama.
 */
export async function enviarPush(perfilIds: string[], aviso: (idioma: Idioma) => AvisoPush): Promise<boolean> {
  const admin = createAdminClient();
  const { data: suscripciones, error } = await admin
    .from("push_suscripciones")
    .select("id, endpoint, p256dh, auth, perfiles(idioma)")
    .in("perfil_id", perfilIds);
  if (error) return false;
  if (!suscripciones || suscripciones.length === 0) return true;

  const payloads = new Map<Idioma, string>();
  const payloadEn = (idioma: Idioma) => {
    if (!payloads.has(idioma)) payloads.set(idioma, JSON.stringify(aviso(idioma)));
    return payloads.get(idioma)!;
  };

  const resultados = await Promise.all(
    suscripciones.map(async (s) => {
      const perfil = (Array.isArray(s.perfiles) ? s.perfiles[0] : s.perfiles) as { idioma: string | null } | null;
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payloadEn(idiomaDe(perfil?.idioma)),
          { timeout: 5_000 }
        );
        return true;
      } catch (err) {
        // 404/410: el navegador o el usuario dieron de baja la suscripción de su lado
        // (desinstaló, borró datos, revocó el permiso). Se limpia para no seguir
        // reintentando contra un endpoint muerto.
        const codigo = (err as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          await admin.from("push_suscripciones").delete().eq("id", s.id);
          return true;
        }
        return false;
      }
    })
  );
  return resultados.every(Boolean);
}

