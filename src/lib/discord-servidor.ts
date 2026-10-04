import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Espacios privados en Discord para cada Proyecto o Equipo (#269): un canal de texto y uno
 * de voz, dentro de la categoría «Proyectos» o «Equipos» del servidor de Yalope, que solo
 * ven los integrantes de la sala que vincularon su Discord.
 *
 * Todo pasa por el bot (`DISCORD_BOT_TOKEN`). `sincronizarEspacio` es idempotente: deja los
 * permisos de los canales exactamente con quienes hoy están en la sala, así que se puede
 * llamar después de cualquier cambio (alguien entra, sale, vincula su cuenta, se cierra la
 * iniciativa) sin llevar la cuenta de qué cambió.
 */
const API = "https://discord.com/api/v10";
const GUILD = process.env.DISCORD_GUILD_ID;
const BOT = process.env.DISCORD_BOT_TOKEN;

export function discordConfigurado() {
  return !!(GUILD && BOT && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

// Permisos (bits de Discord). Todos entran en un número normal (el más alto es el 28).
const P = {
  VIEW: (1 << 10),
  SEND: (1 << 11),
  EMBED: (1 << 14),
  ATTACH: (1 << 15),
  HISTORY: (1 << 16),
  CONNECT: (1 << 20),
  SPEAK: (1 << 21),
  STREAM: (1 << 9),
  VAD: (1 << 25),
  MANAGE_CHANNELS: (1 << 4),
};
/** Integrante de una iniciativa abierta: ver, escribir, mandar archivos, hablar y compartir pantalla. */
const INTEGRANTE = P.VIEW | P.SEND | P.EMBED | P.ATTACH | P.HISTORY | P.CONNECT | P.SPEAK | P.STREAM | P.VAD;
/** Iniciativa cerrada: el espacio queda como archivo, solo para leer. */
const SOLO_LECTURA = P.VIEW | P.HISTORY;
const CERRADO_DENEGADO = P.SEND | P.CONNECT | P.SPEAK;
/**
 * El bot se deja acceso a sí mismo para poder seguir administrando el canal. Sin «Manage
 * Permissions» (MANAGE_ROLES): darlo en un canal exige ser Administrador del servidor (403), y
 * para editar permisos alcanza con el que ya le da su rol.
 */
const BOT_PROPIO = P.VIEW | P.SEND | P.HISTORY | P.CONNECT | P.MANAGE_CHANNELS;

async function api<T>(ruta: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; datos: T | null }> {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bot ${BOT}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const texto = await res.text();
  return { ok: res.ok, status: res.status, datos: texto ? (JSON.parse(texto) as T) : null };
}

let idBot: string | null = null;
async function botId() {
  if (!idBot) idBot = (await api<{ id: string }>("/users/@me")).datos?.id ?? null;
  return idBot;
}

export function urlCanal(canalId: string) {
  return `https://discord.com/channels/${GUILD}/${canalId}`;
}

/** Nombre de canal de texto válido en Discord: minúsculas, sin acentos, con guiones. */
function nombreCanal(titulo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "espacio";
}

type SalaConIniciativa = {
  id: string;
  titulo: string | null;
  obra_id: string | null;
  equipo_id: string | null;
  discord_canal_id: string | null;
  discord_voz_id: string | null;
  obras: { titulo: string; creador_id: string; estado: string } | { titulo: string; creador_id: string; estado: string }[] | null;
  equipos: { titulo: string; creador_id: string; activo: boolean } | { titulo: string; creador_id: string; activo: boolean }[] | null;
};

async function leerSala(salaId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("salas")
    .select(
      "id, titulo, obra_id, equipo_id, discord_canal_id, discord_voz_id, obras(titulo, creador_id, estado), equipos(titulo, creador_id, activo)",
    )
    .eq("id", salaId)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as SalaConIniciativa;
  const obra = Array.isArray(s.obras) ? s.obras[0] : s.obras;
  const equipo = Array.isArray(s.equipos) ? s.equipos[0] : s.equipos;
  return {
    ...s,
    titulo: obra?.titulo ?? equipo?.titulo ?? s.titulo ?? "Espacio",
    duenoId: obra?.creador_id ?? equipo?.creador_id ?? null,
    esEquipo: !!s.equipo_id,
    cerrada: obra ? obra.estado === "cerrada" : equipo ? !equipo.activo : false,
  };
}

/** Las cuentas de Discord de quienes hoy están en la sala (las que vincularon la suya). */
async function discordDeIntegrantes(salaId: string) {
  const admin = createAdminClient();
  // Un error de lectura tira en vez de devolver []: una lista vacía por un error transitorio
  // le sacaría el acceso a todo el grupo.
  const { data: integrantes, error } = await admin.from("sala_integrantes").select("perfil_id").eq("sala_id", salaId);
  if (error) throw new Error(`sala_integrantes: ${error.message}`);
  const ids = (integrantes ?? []).map((i) => i.perfil_id);
  if (ids.length === 0) return [];
  const { data: perfiles, error: errorPerfiles } = await admin.from("perfiles").select("discord_user_id").in("id", ids);
  if (errorPerfiles) throw new Error(`perfiles: ${errorPerfiles.message}`);
  return (perfiles ?? []).map((p) => p.discord_user_id).filter((d): d is string => !!d);
}

type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string };

/**
 * Deja los dos canales de la sala con exactamente sus integrantes actuales. Si los canales
 * se borraron a mano en Discord, se olvidan (la sala queda sin espacio y se puede volver a
 * abrir). Devuelve si la sala sigue teniendo su canal de texto (el que se abre desde la app).
 */
export async function sincronizarEspacio(salaId: string): Promise<boolean> {
  if (!discordConfigurado()) return false;
  const sala = await leerSala(salaId);
  if (!sala?.discord_canal_id && !sala?.discord_voz_id) return false;

  // Sin el id del bot no se toca nada: si no, su propio permiso quedaría entre los que hay
  // que borrar y perdería el acceso al canal.
  const bot = await botId();
  if (!bot) throw new Error("Discord: no se pudo leer el id del bot.");
  const quienes = new Set(await discordDeIntegrantes(salaId));
  const allow = (sala.cerrada ? SOLO_LECTURA : INTEGRANTE).toString();
  const deny = (sala.cerrada ? CERRADO_DENEGADO : 0).toString();
  let hayTexto = false;
  const fallos: string[] = [];

  for (const [columna, canalId] of [
    ["discord_canal_id", sala.discord_canal_id],
    ["discord_voz_id", sala.discord_voz_id],
  ] as const) {
    if (!canalId) continue;
    const canal = await api<{ permission_overwrites: Overwrite[] }>(`/channels/${canalId}`);
    if (canal.status === 404) {
      await createAdminClient()
        .from("salas")
        .update(columna === "discord_canal_id" ? { discord_canal_id: null } : { discord_voz_id: null })
        .eq("id", salaId);
      continue;
    }
    if (!canal.ok || !canal.datos) continue;
    if (columna === "discord_canal_id") hayTexto = true;
    const actuales = canal.datos.permission_overwrites.filter((o) => o.type === 1 && o.id !== bot);

    // Quien ya no está en la sala, afuera.
    for (const o of actuales) {
      if (quienes.has(o.id)) continue;
      const r = await api(`/channels/${canalId}/permissions/${o.id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) fallos.push(`quitar ${o.id} de ${canalId}: ${r.status}`);
    }
    // Quien está, adentro (o con los permisos de iniciativa cerrada).
    for (const id of Array.from(quienes)) {
      const o = actuales.find((x) => x.id === id);
      if (o && o.allow === allow && o.deny === deny) continue;
      const r = await api(`/channels/${canalId}/permissions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ type: 1, allow, deny }),
      });
      if (!r.ok) fallos.push(`dar acceso a ${id} en ${canalId}: ${r.status}`);
    }
  }
  // Se intentan todos los cambios y recién después se avisa: una revocación que falla no
  // puede pasar como hecha (la persona conservaría el acceso).
  if (fallos.length) throw new Error(`Discord: ${fallos.join("; ")}`);
  return hayTexto;
}

/**
 * El dueño abre el espacio de su Proyecto o Equipo: crea el canal de texto y el de voz en la
 * categoría que corresponde, privados (solo el bot y los integrantes), y sincroniza.
 */
export async function abrirEspacio(
  salaId: string,
  usuarioId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!discordConfigurado()) return { ok: false, error: "Discord no está configurado." };
  const sala = await leerSala(salaId);
  if (!sala) return { ok: false, error: "No existe esa sala." };
  if (!sala.duenoId) return { ok: false, error: "Solo los Proyectos y Equipos tienen espacio en Discord." };
  if (sala.duenoId !== usuarioId) return { ok: false, error: "Solo quien creó el Proyecto o Equipo puede abrirlo." };

  if (sala.discord_canal_id && (await sincronizarEspacio(salaId))) {
    return { ok: true, url: urlCanal(sala.discord_canal_id) };
  }

  const bot = await botId();
  if (!bot || !GUILD) return { ok: false, error: "No se pudo hablar con Discord." };
  const categoria = sala.esEquipo ? process.env.DISCORD_CATEGORIA_EQUIPOS : process.env.DISCORD_CATEGORIA_PROYECTOS;
  const privado: Overwrite[] = [
    { id: GUILD, type: 0, allow: "0", deny: P.VIEW.toString() }, // @everyone no lo ve
    { id: bot, type: 1, allow: BOT_PROPIO.toString(), deny: "0" },
  ];
  const crear = (cuerpo: Record<string, unknown>) =>
    api<{ id: string }>(`/guilds/${GUILD}/channels`, {
      method: "POST",
      body: JSON.stringify({ parent_id: categoria || undefined, permission_overwrites: privado, ...cuerpo }),
    });

  const texto = await crear({
    name: nombreCanal(sala.titulo),
    type: 0,
    topic: `Espacio privado de «${sala.titulo}» en Yalope.`,
  });
  if (!texto.ok || !texto.datos) return { ok: false, error: `Discord respondió ${texto.status}.` };
  const voz = await crear({ name: `🎭 ${sala.titulo}`.slice(0, 100), type: 2 });

  await createAdminClient()
    .from("salas")
    .update({ discord_canal_id: texto.datos.id, discord_voz_id: voz.datos?.id ?? null })
    .eq("id", salaId);
  await sincronizarEspacio(salaId);
  return { ok: true, url: urlCanal(texto.datos.id) };
}

/** Sincroniza todos los espacios de las salas donde está (o estaba) una persona, y sus logros. */
export async function sincronizarEspaciosDe(perfilId: string) {
  if (!discordConfigurado()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("sala_integrantes").select("sala_id").eq("perfil_id", perfilId);
  for (const { sala_id } of data ?? []) await sincronizarEspacio(sala_id);
  // Los logros (#336) cambian con las mismas acciones que los espacios: entrar a un grupo, un
  // match, vincular la cuenta.
  await sincronizarLogros(perfilId).catch(() => {});
}

/**
 * Suma a una persona al servidor con el token OAuth que dio al vincular (scope
 * `guilds.join`). Si ya estaba, Discord responde 204 y no cambia nada.
 */
export async function sumarAlServidor(discordUserId: string, accessToken: string): Promise<boolean> {
  if (!GUILD) return false;
  const r = await api(`/guilds/${GUILD}/members/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({ access_token: accessToken }),
  });
  return r.ok; // 201: la sumó; 204: ya estaba
}

/** Las salas con espacio de un Proyecto o Equipo. */
async function salasConEspacio(ids: { obraId?: string | null; equipoId?: string | null }) {
  if (!ids.obraId && !ids.equipoId) return [];
  const consulta = createAdminClient()
    .from("salas")
    .select("id, discord_canal_id, discord_voz_id")
    .or("discord_canal_id.not.is.null,discord_voz_id.not.is.null");
  const { data, error } = ids.obraId
    ? await consulta.eq("obra_id", ids.obraId)
    : await consulta.eq("equipo_id", ids.equipoId!);
  // Una lista vacía tiene que querer decir «no hay espacios», no «falló la consulta».
  if (error) throw new Error(`salas: ${error.message}`);
  return data ?? [];
}

/** Después de cerrar, reabrir o desactivar una iniciativa: el espacio pasa a solo lectura o vuelve. */
export async function sincronizarEspaciosDeIniciativa(ids: { obraId?: string | null; equipoId?: string | null }) {
  if (!discordConfigurado()) return;
  for (const s of await salasConEspacio(ids)) await sincronizarEspacio(s.id);
}

/**
 * Los canales de una iniciativa, para borrarlos después de borrarla (la sala cae en cascada y
 * con ella los ids). Se piden antes del borrado y se borran recién cuando se confirmó.
 */
export async function canalesDeIniciativa(ids: { obraId?: string | null; equipoId?: string | null }) {
  if (!discordConfigurado()) return [];
  return (await salasConEspacio(ids)).flatMap((s) => [s.discord_canal_id, s.discord_voz_id]).filter((c): c is string => !!c);
}

/**
 * Borra canales que quedaron huérfanos: solo si ya no los usa ninguna sala y están en una de
 * las categorías de Yalope (así nadie puede borrar otro canal del servidor pasando su id).
 */
export async function borrarCanalesHuerfanos(canales: string[]) {
  if (!discordConfigurado() || canales.length === 0) return;
  const admin = createAdminClient();
  const lista = canales.join(",");
  const { data: enUso, error } = await admin
    .from("salas")
    .select("discord_canal_id, discord_voz_id")
    .or(`discord_canal_id.in.(${lista}),discord_voz_id.in.(${lista})`);
  if (error) throw new Error(`salas: ${error.message}`);
  const usados = new Set((enUso ?? []).flatMap((s) => [s.discord_canal_id, s.discord_voz_id]));
  const categorias = [process.env.DISCORD_CATEGORIA_PROYECTOS, process.env.DISCORD_CATEGORIA_EQUIPOS];
  const fallos: string[] = [];
  for (const canal of canales) {
    if (!/^\d+$/.test(canal) || usados.has(canal)) continue;
    const info = await api<{ parent_id: string | null }>(`/channels/${canal}`);
    if (info.status === 404) continue;
    if (!info.datos || !categorias.includes(info.datos.parent_id ?? undefined)) continue;
    const r = await api(`/channels/${canal}`, { method: "DELETE" });
    if (!r.ok && r.status !== 404) fallos.push(`${canal}: ${r.status}`);
  }
  if (fallos.length) throw new Error(`Discord: no se pudieron borrar ${fallos.join("; ")}`);
}

// ── Logros (#336) ──────────────────────────────────────────────────────────────

/**
 * Logros: roles del servidor que la app asigna sola a quien vinculó su Discord, según lo que
 * hizo en Yalope. Los roles los crea `scripts/discord-servidor.mjs` y acá se buscan por nombre:
 * si alguno no existe, se saltea.
 */
export const LOGROS = [
  { nombre: "🎭 Perfil completo", descripcion: "Tres fotos o más y la experiencia escrita." },
  { nombre: "💫 Primer match", descripcion: "El primer interés mutuo, de cualquiera de los dos lados." },
  { nombre: "🎬 En elenco", descripcion: "Aceptó una convocatoria y entró a un grupo." },
  { nombre: "🏗️ Creador/a", descripcion: "Publicó un proyecto o armó un equipo." },
  { nombre: "🌱 Pionero/a", descripcion: "Está en Yalope desde el principio." },
] as const;

/** Cuentas creadas antes de esta fecha son «Pionero/a». */
const FIN_PIONEROS = "2026-11-01T00:00:00Z";

async function logrosDe(perfilId: string): Promise<Set<string>> {
  // `matches` y `convocatorias` no están en los tipos generados: cliente sin tipar para esas.
  const admin = createAdminClient() as unknown as SupabaseClient;
  const contar = async (q: PromiseLike<{ count: number | null }>) => ((await q).count ?? 0) > 0;
  const [perfil, fotos, talento, matches, elenco, obras, equipos] = await Promise.all([
    admin.from("perfiles").select("creado_en").eq("id", perfilId).maybeSingle(),
    admin.from("fotos_talento").select("id", { count: "exact", head: true }).eq("talento_id", perfilId),
    admin.from("perfiles_talento").select("experiencia").eq("id", perfilId).maybeSingle(),
    contar(
      admin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`talento_id.eq.${perfilId},creador_id.eq.${perfilId}`),
    ),
    // Convocatorias aceptadas de sus matches como Talento.
    (async () => {
      const { data: suyos } = await admin.from("matches").select("id").eq("talento_id", perfilId);
      const ids = (suyos ?? []).map((m) => m.id);
      if (ids.length === 0) return false;
      return contar(
        admin.from("convocatorias").select("id", { count: "exact", head: true }).in("match_id", ids).eq("estado", "aceptada"),
      );
    })(),
    contar(admin.from("obras").select("id", { count: "exact", head: true }).eq("creador_id", perfilId).neq("estado", "borrador")),
    contar(admin.from("equipos").select("id", { count: "exact", head: true }).eq("creador_id", perfilId)),
  ]);

  const logros = new Set<string>();
  if ((fotos.count ?? 0) >= 3 && (talento.data?.experiencia ?? "").trim().length > 0) logros.add(LOGROS[0].nombre);
  if (matches) logros.add(LOGROS[1].nombre);
  if (elenco) logros.add(LOGROS[2].nombre);
  if (obras || equipos) logros.add(LOGROS[3].nombre);
  if (perfil.data?.creado_en && perfil.data.creado_en < FIN_PIONEROS) logros.add(LOGROS[4].nombre);
  return logros;
}

let rolesDeLogros: Map<string, string> | null = null;
async function idsDeLogros(): Promise<Map<string, string>> {
  if (rolesDeLogros) return rolesDeLogros;
  const r = await api<{ id: string; name: string }[]>(`/guilds/${GUILD}/roles`);
  const nombres = new Set<string>(LOGROS.map((l) => l.nombre));
  rolesDeLogros = new Map((r.datos ?? []).filter((x) => nombres.has(x.name)).map((x) => [x.name, x.id]));
  return rolesDeLogros;
}

/**
 * Deja los roles de logros de una persona exactamente como corresponden: suma los ganados y
 * saca los que ya no aplican (p. ej. si borró su único proyecto). Idempotente.
 */
export async function sincronizarLogros(perfilId: string) {
  if (!discordConfigurado()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("perfiles").select("discord_user_id").eq("id", perfilId).maybeSingle();
  const discordId = data?.discord_user_id;
  if (!discordId) return;

  const miembro = await api<{ roles: string[] }>(`/guilds/${GUILD}/members/${discordId}`);
  if (!miembro.ok || !miembro.datos) return; // no está en el servidor
  const actuales = new Set(miembro.datos.roles);
  const [ganados, ids] = await Promise.all([logrosDe(perfilId), idsDeLogros()]);

  for (const [nombre, rolId] of ids) {
    const tiene = actuales.has(rolId);
    const corresponde = ganados.has(nombre);
    if (corresponde && !tiene) await api(`/guilds/${GUILD}/members/${discordId}/roles/${rolId}`, { method: "PUT" });
    if (!corresponde && tiene) await api(`/guilds/${GUILD}/members/${discordId}/roles/${rolId}`, { method: "DELETE" });
  }
}
