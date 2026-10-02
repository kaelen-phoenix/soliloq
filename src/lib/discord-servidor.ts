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
 * abrir). Devuelve si la sala tiene espacio después de sincronizar.
 */
export async function sincronizarEspacio(salaId: string): Promise<boolean> {
  if (!discordConfigurado()) return false;
  const sala = await leerSala(salaId);
  if (!sala?.discord_canal_id) return false;

  // Sin el id del bot no se toca nada: si no, su propio permiso quedaría entre los que hay
  // que borrar y perdería el acceso al canal.
  const bot = await botId();
  if (!bot) throw new Error("Discord: no se pudo leer el id del bot.");
  const quienes = new Set(await discordDeIntegrantes(salaId));
  const allow = (sala.cerrada ? SOLO_LECTURA : INTEGRANTE).toString();
  const deny = (sala.cerrada ? CERRADO_DENEGADO : 0).toString();
  let alguno = false;

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
    alguno = true;
    const actuales = canal.datos.permission_overwrites.filter((o) => o.type === 1 && o.id !== bot);

    // Quien ya no está en la sala, afuera.
    for (const o of actuales) {
      if (!quienes.has(o.id)) await api(`/channels/${canalId}/permissions/${o.id}`, { method: "DELETE" });
    }
    // Quien está, adentro (o con los permisos de iniciativa cerrada).
    for (const id of Array.from(quienes)) {
      const o = actuales.find((x) => x.id === id);
      if (o && o.allow === allow && o.deny === deny) continue;
      await api(`/channels/${canalId}/permissions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ type: 1, allow, deny }),
      });
    }
  }
  return alguno;
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

/** Sincroniza todos los espacios de las salas donde está (o estaba) una persona. */
export async function sincronizarEspaciosDe(perfilId: string) {
  if (!discordConfigurado()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("sala_integrantes").select("sala_id").eq("perfil_id", perfilId);
  for (const { sala_id } of data ?? []) await sincronizarEspacio(sala_id);
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
    .not("discord_canal_id", "is", null);
  const { data } = ids.obraId ? await consulta.eq("obra_id", ids.obraId) : await consulta.eq("equipo_id", ids.equipoId!);
  return data ?? [];
}

/** Después de cerrar, reabrir o desactivar una iniciativa: el espacio pasa a solo lectura o vuelve. */
export async function sincronizarEspaciosDeIniciativa(ids: { obraId?: string | null; equipoId?: string | null }) {
  if (!discordConfigurado()) return;
  for (const s of await salasConEspacio(ids)) await sincronizarEspacio(s.id);
}

/** Antes de borrar una iniciativa (la sala cae en cascada): borra sus canales en Discord. */
export async function borrarEspaciosDeIniciativa(ids: { obraId?: string | null; equipoId?: string | null }) {
  if (!discordConfigurado()) return;
  for (const s of await salasConEspacio(ids)) {
    for (const canal of [s.discord_canal_id, s.discord_voz_id]) {
      if (canal) await api(`/channels/${canal}`, { method: "DELETE" });
    }
  }
}
