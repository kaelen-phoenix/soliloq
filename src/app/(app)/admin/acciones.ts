"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { borrarUsuarioYArchivos } from "@/lib/supabase/borrar-usuario";
import { enviarBienvenidasPendientes, type ResumenBienvenidas } from "@/lib/bienvenida-servidor";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { mailBienvenida } from "@/lib/correos/bienvenida";
import { mailInvitacion } from "@/lib/correos/acceso";
import { consumirUsoIa, devolverUsoIa, enBloque, llamarModelo, objetoJson } from "@/lib/ia-servidor";
import { INSTRUCCIONES_MODERACION } from "@/lib/ia-prompts";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Borra una cuenta desde el panel de admin. Irreversible — la baja reversible es
 * `admin_suspender_usuario` (0040).
 *
 * El guard `es_admin` de las RPC no alcanza acá porque el borrado va por el cliente
 * service-role (`borrarUsuarioYArchivos`), que saltea RLS; se chequea a mano.
 */
export async function adminBorrarUsuario(idObjetivo: string): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.esAdmin) return { ok: false, error: "No autorizado." };
  if (idObjetivo === user.id) return { ok: false, error: "No podés borrarte a vos mismo." };

  // `perfiles_select_propio` (0001) solo deja leer la fila propia: con el cliente de
  // sesión, mirar el perfil de otra persona siempre da null, sea quien sea. Hace falta el
  // service-role para chequear si el objetivo es admin.
  // Todo en el `try`: `createAdminClient()` también tira (p. ej. sin la clave de servicio),
  // y una excepción acá dejaba el panel trabado en «Borrando…» (#229).
  try {
    const admin = createAdminClient();
    const { data: objetivo } = await admin
      .from("perfiles")
      .select("es_admin")
      .eq("id", idObjetivo)
      .maybeSingle();
    if (!objetivo) return { ok: false, error: "Ese usuario no existe." };
    if (objetivo.es_admin) return { ok: false, error: "No podés borrar a otro admin." };

    await borrarUsuarioYArchivos(idObjetivo);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo borrar." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * «Enviar bienvenida a quienes no la recibieron» (#272): el mail de bienvenida a todas las
 * cuentas habilitadas que todavía no lo tienen. La primera vez es el envío a todos los
 * usuarios; después solo agarra a quien haya quedado sin recibirlo.
 */
export async function adminEnviarBienvenidas(): Promise<
  { ok: true; resumen: ResumenBienvenidas } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.esAdmin) return { ok: false, error: "No autorizado." };

  try {
    return { ok: true, resumen: await enviarBienvenidasPendientes({ limite: 200 }) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar." };
  }
}

/** Un admin, o null. */
async function adminActual() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const estado = await leerEstadoCuenta(supabase, user.id);
  return estado.esAdmin ? user : null;
}

/**
 * Manda el mail de bienvenida solo al admin que lo pide, para revisarlo antes del envío a
 * todos (#272). No marca nada: a esa cuenta le va a llegar igual con el envío real.
 */
export async function adminEnviarmePruebaBienvenida(): Promise<
  { ok: true; para: string } | { ok: false; error: string }
> {
  const user = await adminActual();
  if (!user?.email) return { ok: false, error: "No autorizado." };
  if (!correoConfigurado()) return { ok: false, error: "Falta RESEND_API_KEY en Vercel." };
  const mail = mailBienvenida({ discord: process.env.NEXT_PUBLIC_DISCORD_INVITACION });
  const r = await enviarCorreo({ para: user.email, asunto: mail.asunto, html: mail.html, texto: mail.texto });
  if (!r.ok) return { ok: false, error: "error" in r ? r.error : "No está configurado el envío." };
  return { ok: true, para: user.email };
}

export type EstadoBienvenida = { id: string; email: string; enviadaEn: string | null };

/** Quién ya recibió la bienvenida y quién no, entre las cuentas habilitadas (#272). */
export async function adminEstadoBienvenidas(): Promise<
  { ok: true; cuentas: EstadoBienvenida[] } | { ok: false; error: string }
> {
  if (!(await adminActual())) return { ok: false, error: "No autorizado." };
  try {
    const admin = createAdminClient();
    const { data: perfiles, error } = await admin
      .from("perfiles")
      .select("id, bienvenida_enviada_en")
      .not("aprobado_en", "is", null)
      .not("normas_aceptadas_en", "is", null)
      .is("suspendido_en", null);
    if (error) return { ok: false, error: error.message };
    // `listUsers` pagina: se leen todas las páginas, no solo la primera.
    const email = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data, error: errorUsuarios } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (errorUsuarios) return { ok: false, error: errorUsuarios.message };
      for (const u of data.users) email.set(u.id, u.email ?? "(sin email)");
      if (data.users.length < 1000) break;
    }
    const cuentas = (perfiles ?? [])
      .map((p) => ({ id: p.id, email: email.get(p.id) ?? "(sin email)", enviadaEn: p.bienvenida_enviada_en }))
      // Primero quienes faltan; después por fecha de envío.
      .sort((a, b) => (a.enviadaEn ? 1 : 0) - (b.enviadaEn ? 1 : 0) || a.email.localeCompare(b.email));
    return { ok: true, cuentas };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo leer." };
  }
}

/**
 * Después de `admin_crear_invitacion` (#272): si ese email todavía no tiene cuenta, le manda
 * el mail de invitación con el link para crearla. Si ya la tenía y esperaba, la invitación
 * la habilitó y el aviso que le corresponde es `acceso_habilitado` (0092), no este.
 */
export async function adminMandarInvitacion(email: string): Promise<
  { ok: true; enviado: boolean } | { ok: false; error: string }
> {
  if (!(await adminActual())) return { ok: false, error: "No autorizado." };
  if (!correoConfigurado()) return { ok: true, enviado: false };
  const destino = email.trim().toLowerCase();
  try {
    const admin = createAdminClient();
    const { data: invitacion } = await admin
      .from("invitaciones")
      .select("usado_en")
      .eq("email", destino)
      .maybeSingle();
    // Sin invitación (no se creó) o ya usada (tenía cuenta): no corresponde este mail.
    if (!invitacion || invitacion.usado_en) return { ok: true, enviado: false };
    const mail = mailInvitacion();
    const r = await enviarCorreo({ para: destino, asunto: mail.asunto, html: mail.html, texto: mail.texto });
    return r.ok ? { ok: true, enviado: true } : { ok: false, error: "error" in r ? r.error : "No se pudo enviar." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar." };
  }
}

export interface MarcaModeracion {
  tipo: "perfil" | "proyecto" | "equipo" | "rol";
  id: string;
  titulo: string;
  motivo: string;
}

/**
 * «Revisar con IA» (#323): pasa lo publicado hace poco (perfiles, proyectos, equipos, roles)
 * por la IA y devuelve lo que parece problemático, con el motivo. No toca nada: es una lista
 * para que una persona admin mire. Cuenta en el mismo tope de usos de IA.
 */
export async function adminRevisarConIa(): Promise<
  { ok: true; marcados: MarcaModeracion[]; revisados: number } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.esAdmin) return { ok: false, error: "No autorizado." };

  let usoId: number | null = null;
  try {
    // Service role: los textos de otras cuentas no se leen con la sesión (RLS, 0089).
    const admin = createAdminClient();
    const consultas = await Promise.all([
      admin.from("perfiles").select("id").order("creado_en", { ascending: false }).limit(200),
      admin.from("obras").select("id, titulo, sinopsis").order("creado_en", { ascending: false }).limit(20),
      admin.from("equipos").select("id, titulo, descripcion").order("creado_en", { ascending: false }).limit(20),
      admin
        .from("roles")
        .select("id, obra_id, nombre, descripcion")
        .not("descripcion", "is", null)
        .order("creado_en", { ascending: false })
        .limit(30),
    ]);
    const fallida = consultas.find((c) => c.error);
    if (fallida?.error) return { ok: false, error: `No se pudo leer lo publicado: ${fallida.error.message}` };
    const [{ data: cuentas }, { data: obras }, { data: equipos }, { data: roles }] = consultas;
    // De las cuentas más nuevas, las primeras 40 que tienen Experiencia escrita (sin texto no
    // hay nada que revisar, y no tienen que ocupar el cupo).
    const orden = (cuentas ?? []).map((c) => c.id);
    const { data: conTexto, error: errorPerfiles } = await admin
      .from("perfiles_talento")
      .select("id, nombre, experiencia")
      .in("id", orden)
      .not("experiencia", "is", null);
    if (errorPerfiles) return { ok: false, error: `No se pudieron leer los perfiles: ${errorPerfiles.message}` };
    const perfiles = (conTexto ?? [])
      .sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))
      .slice(0, 40);

    const items: (Omit<MarcaModeracion, "motivo"> & { texto: string })[] = [
      ...perfiles
        .filter((p) => p.experiencia)
        .map((p) => ({ tipo: "perfil" as const, id: p.id, titulo: p.nombre, texto: p.experiencia! })),
      ...(obras ?? []).map((o) => ({ tipo: "proyecto" as const, id: o.id, titulo: o.titulo, texto: `${o.titulo}. ${o.sinopsis ?? ""}` })),
      ...(equipos ?? []).map((e) => ({ tipo: "equipo" as const, id: e.id, titulo: e.titulo, texto: `${e.titulo}. ${e.descripcion ?? ""}` })),
      ...(roles ?? []).map((r) => ({ tipo: "rol" as const, id: r.obra_id, titulo: r.nombre, texto: `${r.nombre}. ${r.descripcion}` })),
    ];
    if (items.length === 0) return { ok: true, marcados: [], revisados: 0 };

    const uso = await consumirUsoIa(supabase);
    if (uso.error !== undefined) return { ok: false, error: uso.error };
    usoId = uso.usoId;

    const listado = items.map((it, i) => `${i + 1}. [${it.tipo}] ${it.texto.replace(/\s+/g, " ").slice(0, 2000)}`).join("\n");
    const crudo = await llamarModelo({
      sistema: INSTRUCCIONES_MODERACION,
      usuario: enBloque("publicaciones", listado),
      maxTokens: 800,
      json: true,
    });
    const crudos = objetoJson(crudo)?.marcados;
    // Sin la lista no se sabe nada: no se puede informar «no encontramos nada».
    if (!Array.isArray(crudos)) {
      await devolverUsoIa(uso.usoId).catch(() => {});
      return { ok: false, error: "La IA no devolvió una respuesta válida. Probá de nuevo." };
    }
    const lista = crudos as { n?: unknown; motivo?: unknown }[];
    const marcados = lista.flatMap((m) => {
      const it = typeof m.n === "number" ? items[m.n - 1] : undefined;
      if (!it || typeof m.motivo !== "string") return [];
      const { texto: _texto, ...resto } = it;
      return [{ ...resto, motivo: m.motivo.slice(0, 200) }];
    });
    return { ok: true, marcados, revisados: items.length };
  } catch (e) {
    // #343: si falló después de consumir, el uso no cuenta.
    if (usoId !== null) await devolverUsoIa(usoId).catch(() => {});
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo revisar." };
  }
}
