// Ordena el servidor de Discord de Yalope (#334, #338) para que se vea como la app: ícono de la
// app, servidor «Comunidad» con canal de reglas y pantalla de bienvenida, canales de info de
// solo lectura con mensajes fijados, y los textos tomados de la app (portada, Normas de la
// Comunidad), sin agregar nada que la app no tenga.
//
// Idempotente: si el bot ya publicó en un canal, edita su mensaje en vez de duplicarlo. No toca
// los espacios privados de Proyectos y Equipos (solo el nombre de sus categorías: la app las
// busca por id).
//
//   node scripts/discord-servidor.mjs   (token del bot en ~/.soliloq-deploy/discord-bot-token.txt)
//
// Para cambiar un texto (p. ej. #anuncios), editarlo acá y volver a correrlo.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOKEN = fs.readFileSync(path.join(os.homedir(), ".soliloq-deploy/discord-bot-token.txt"), "utf8").trim();
const G = "1554824547042066532";
const BOT_ROL = "1555551141498986639";
const CAT_PROYECTOS = "1555552948547878973";
const CAT_EQUIPOS = "1555552811176042607";
const COLOR = 0xf2571e; // el naranja del isotipo (brand-400), igual que en la app
const APP = "https://yalope.com";

// Los textos salen de la app (src/mensajes/es.json), no se escriben acá a mano.
const ES = JSON.parse(fs.readFileSync(new URL("../src/mensajes/es.json", import.meta.url), "utf8"));
const L = ES.landing;
const N = ES.normas;
const sinMarcas = (t) => t.replace(/<\/?d>/g, "");

async function api(metodo, p, cuerpo) {
  for (;;) {
    const r = await fetch(`https://discord.com/api/v10${p}`, {
      method: metodo,
      headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (r.status === 429) {
      const j = await r.json();
      await new Promise((ok) => setTimeout(ok, (j.retry_after ?? 1) * 1000 + 200));
      continue;
    }
    const t = await r.text();
    if (!r.ok) throw new Error(`${metodo} ${p}: ${r.status} ${t.slice(0, 300)}`);
    return t ? JSON.parse(t) : null;
  }
}

// Marca de los mensajes informativos (el lema del pie de la app): el script solo edita los que
// la llevan. La anterior se acepta para editar lo ya publicado en vez de duplicarlo.
const pie = { text: `Yalope · ${L.pieLema}` };
const PIES = [pie.text, "Yalope · Teatro y audiovisual"];

const SEND = 1n << 11n;
const SOLO_LECTURA = [
  { id: G, type: 0, allow: "0", deny: String(SEND | (1n << 35n) | (1n << 36n) | (1n << 38n)) }, // enviar, hilos
  { id: BOT_ROL, type: 0, allow: String(SEND | (1n << 14n)), deny: "0" },
];

const canales = await api("GET", `/guilds/${G}/channels`);
const porId = (id) => canales.find((c) => c.id === id);
// Solo dentro de la categoría destino: un Equipo o Proyecto de la app puede llamarse «normas», y
// sin esto el script tomaría ese canal privado, lo movería y le cambiaría los permisos.
const porNombre = (nombre, tipo, padre) =>
  canales.find((c) => c.name === nombre && c.type === tipo && c.parent_id === padre);

async function categoria(id, nombre, posicion) {
  await api("PATCH", `/channels/${id}`, { name: nombre, position: posicion });
  return id;
}

async function canal({ id, nombre, padre, tema, permisos, tipo = 0, posicion }) {
  const existente = (id && porId(id)) || porNombre(nombre, tipo, padre);
  const datos = {
    name: nombre,
    parent_id: padre,
    ...(tipo === 0 ? { topic: tema ?? null } : {}),
    ...(posicion != null ? { position: posicion } : {}),
    ...(permisos ? { permission_overwrites: permisos } : {}),
  };
  if (existente) {
    await api("PATCH", `/channels/${existente.id}`, datos);
    return existente.id;
  }
  const nuevo = await api("POST", `/guilds/${G}/channels`, { type: tipo, ...datos });
  canales.push(nuevo);
  return nuevo.id;
}

/** Publica (o edita, si el bot ya había publicado) los mensajes de un canal, en orden, y los fija. */
async function publicar(canalId, mensajes) {
  const yo = await api("GET", "/users/@me");
  const previos = (await api("GET", `/channels/${canalId}/messages?limit=50`))
    .filter((m) => m.author?.id === yo.id && PIES.includes(m.embeds?.[0]?.footer?.text))
    .reverse();
  for (const [i, m] of mensajes.entries()) {
    const msg = previos[i]
      ? await api("PATCH", `/channels/${canalId}/messages/${previos[i].id}`, m)
      : await api("POST", `/channels/${canalId}/messages`, m);
    if (!msg.pinned) await api("PUT", `/channels/${canalId}/pins/${msg.id}`);
  }
  // Fijar deja un aviso de sistema («Yalope fijó un mensaje»): en un canal de info sobra.
  for (const m of await api("GET", `/channels/${canalId}/messages?limit=50`)) {
    if (m.type === 6) await api("DELETE", `/channels/${canalId}/messages/${m.id}`);
  }
}

// ── Categorías (como las secciones de la app) ────────────────────────────────
const catInfo = await categoria("1554824548929507398", "📌 Yalope", 0);
const catComunidad = await categoria("1554824548929507401", "💬 Comunidad", 1);
await categoria(CAT_PROYECTOS, "🎭 Proyectos", 2);
await categoria(CAT_EQUIPOS, "👥 Equipos", 3);
const catVoz = await categoria("1554824549487480945", "🔊 Voz", 4);

// ── Info (solo lectura) ─────────────────────────────────────────────────────
const bienvenida = await canal({ id: "1554824548929507399", nombre: "bienvenida", padre: catInfo, permisos: SOLO_LECTURA, posicion: 0, tema: "Qué es Yalope y por dónde empezar." });
const comoFunciona = await canal({ nombre: "cómo-funciona", padre: catInfo, permisos: SOLO_LECTURA, posicion: 1, tema: L.comoFunciona });
const normas = await canal({ nombre: "normas", padre: catInfo, permisos: SOLO_LECTURA, posicion: 2, tema: N.titulo });
const anuncios = await canal({ id: "1554824548929507400", nombre: "anuncios", padre: catInfo, permisos: SOLO_LECTURA, posicion: 3, tema: "Novedades de la app." });

// ── Comunidad ───────────────────────────────────────────────────────────────
const general = await canal({ id: "1554824548929507402", nombre: "general", padre: catComunidad, posicion: 0, tema: `Charla libre de la comunidad. Las convocatorias y los chats de cada proyecto están en la app: ${APP}` });
const presentate = await canal({ nombre: "presentate", padre: catComunidad, posicion: 1, tema: "Contá quién sos y qué hacés. Podés dejar el enlace de tu perfil de Yalope." });
await canal({ id: "1554824548929507403", nombre: "funciones-y-eventos", padre: catComunidad, posicion: 2, tema: "Funciones, muestras y eventos de la comunidad." });
await canal({ id: "1554824549487480944", nombre: "ideas-para-yalope", padre: catComunidad, posicion: 3, tema: "Sugerencias para mejorar la app." });
await canal({ nombre: "ayuda", padre: catComunidad, posicion: 4, tema: "Dudas sobre cómo usar la app." });

// ── Voz ─────────────────────────────────────────────────────────────────────
await canal({ id: "1554824549487480946", nombre: "Charla", padre: catVoz, tipo: 2, posicion: 0 });
await canal({ id: "1554824549487480947", nombre: "Ensayo libre", padre: catVoz, tipo: 2, posicion: 1 });
await canal({ id: "1554824549487480948", nombre: "Escenario", padre: catVoz, tipo: 2, posicion: 2 });

// ── Servidor: ícono de la app, «Comunidad», reglas y bienvenida ─────────────
const icono = await fetch(`${APP}/icons/icon-maskable.png`);
const iconoDataUri = `data:image/png;base64,${Buffer.from(await icono.arrayBuffer()).toString("base64")}`;
const servidor = await api("PATCH", `/guilds/${G}`, {
  name: "Yalope",
  icon: iconoDataUri,
  description: L.heroTexto,
  preferred_locale: "es-ES",
  verification_level: 1, // email verificado
  explicit_content_filter: 2, // revisar el contenido de todos
  default_message_notifications: 1, // solo menciones
  system_channel_id: general,
  rules_channel_id: normas,
});
// Activar «Comunidad» lo puede hacer solo quien administra el servidor (al bot Discord le
// responde 403): Ajustes del servidor → Habilitar Comunidad. El asistente crea su canal privado
// de avisos (#solo-moderadores). Con eso activo, este script arma la pantalla de bienvenida.
if (servidor.features?.includes("COMMUNITY")) {
  await api("PATCH", `/guilds/${G}/welcome-screen`, {
    enabled: true,
    description: "Yalope conecta actores, actrices y creadores de proyectos.",
    welcome_channels: [
      { channel_id: bienvenida, description: "Qué es Yalope", emoji_name: "🎭" },
      { channel_id: comoFunciona, description: L.comoFunciona, emoji_name: "📲" },
      { channel_id: normas, description: N.titulo, emoji_name: "📜" },
      { channel_id: presentate, description: "Contá quién sos", emoji_name: "👋" },
    ],
  });
} else {
  console.log("⚠ Falta activar «Comunidad» a mano (Ajustes del servidor → Habilitar Comunidad); después, volver a correr esto.");
}

// ── Mensajes ────────────────────────────────────────────────────────────────
await publicar(bienvenida, [
  {
    embeds: [
      {
        color: COLOR,
        title: sinMarcas(L.heroTitulo),
        description: `${L.heroTexto}\n\n${L.heroTextoExpansion}`,
        thumbnail: { url: `${APP}/icons/icon-512.png` },
        fields: [
          { name: "📲 La app", value: `[yalope.com](${APP})` },
          {
            name: "🔗 Vinculá tu Discord",
            value: "En la app: **Perfil → Vincular Discord**. Así entrás a los espacios privados de los proyectos y equipos donde participás.",
          },
          { name: "📖 Por dónde empezar", value: `<#${comoFunciona}> · <#${normas}> · <#${presentate}>` },
        ],
        footer: pie,
      },
    ],
  },
]);

await publicar(comoFunciona, [
  {
    embeds: [
      {
        color: COLOR,
        title: L.comoFunciona,
        fields: [
          { name: `1 · ${L.paso1Titulo}`, value: L.paso1Texto },
          { name: `2 · ${L.paso2Titulo}`, value: L.paso2Texto },
          { name: `3 · ${L.paso3Titulo}`, value: L.paso3Texto },
          { name: L.paraArtistasTitulo, value: L.paraArtistasTexto },
          { name: L.paraCreadoresTitulo, value: L.paraCreadoresTexto },
          {
            name: "Chats y Discord",
            value: "Cada proyecto y equipo tiene su chat en la app y, si quien lo armó lo crea, un espacio privado acá, en **🎭 Proyectos** o **👥 Equipos**. Entrás vinculando tu Discord desde la app.",
          },
        ],
        footer: pie,
      },
    ],
  },
]);

const NUMEROS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
await publicar(normas, [
  {
    embeds: [
      {
        color: COLOR,
        title: N.titulo,
        description: `**${N.bienvenida}**\n${N.intro}\n\n${N.aceptacion}`,
        fields: NUMEROS.map((n) => ({ name: N[`norma${n}Titulo`], value: N[`norma${n}Texto`] })),
        url: `${APP}/normas`,
        footer: pie,
      },
    ],
  },
]);

await publicar(anuncios, [
  {
    embeds: [
      {
        color: COLOR,
        title: "📣 Novedades en la app",
        description: `Cambios recientes en [yalope.com](${APP}):`,
        fields: [
          { name: "Una sola app", value: "Explorar · Chats · Proyectos · Convocatorias · Perfil, para todas las personas." },
          { name: "Convocatorias", value: "Dos pestañas: **Mis proyectos** (a quién convocar) y **Mis convocatorias** (donde te pueden convocar), con la opción de retirarte." },
          { name: "Proyectos y equipos", value: "Podés tener varios a la vez, con los roles que necesites." },
          { name: "Alta más simple", value: "Alcanza con una foto, la fecha de nacimiento se escribe y lo que cargaste no se pierde si se cierra la página." },
          { name: "✨ IA", value: "Ayuda a redactar la experiencia y los proyectos, sugiere habilidades y busca talento a partir de lo que escribís." },
        ],
        footer: pie,
      },
    ],
  },
]);

console.log("listo:", { bienvenida, comoFunciona, normas, anuncios });
