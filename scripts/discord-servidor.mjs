// Ordena el servidor de Discord de Yalope (#334): todo en español, canales de info de solo
// lectura con mensajes del bot, y los de comunidad con su descripción. Idempotente: si el bot
// ya publicó en un canal, edita su mensaje en vez de duplicarlo. No toca Proyectos/Equipos.
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
const COLOR = 0xf2571e;
const APP = "https://yalope.com";

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

// Marca de los mensajes informativos: el script solo edita los que la llevan.
const pie = { text: "Yalope · Teatro y audiovisual" };

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

async function canal({ id, nombre, padre, tema, soloLectura, tipo = 0, posicion }) {
  const existente = (id && porId(id)) || porNombre(nombre, tipo, padre);
  const datos = {
    name: nombre,
    parent_id: padre,
    ...(tipo === 0 ? { topic: tema ?? null } : {}),
    ...(posicion != null ? { position: posicion } : {}),
    ...(soloLectura ? { permission_overwrites: SOLO_LECTURA } : {}),
  };
  if (existente) {
    await api("PATCH", `/channels/${existente.id}`, datos);
    return existente.id;
  }
  const nuevo = await api("POST", `/guilds/${G}/channels`, { type: tipo, ...datos });
  canales.push(nuevo);
  return nuevo.id;
}

/** Publica (o edita, si el bot ya había publicado) los mensajes de un canal, en orden. */
async function publicar(canalId, mensajes) {
  const yo = await api("GET", "/users/@me");
  const previos = (await api("GET", `/channels/${canalId}/messages?limit=50`))
    .filter((m) => m.author?.id === yo.id && m.embeds?.[0]?.footer?.text === pie.text)
    .reverse();
  for (const [i, m] of mensajes.entries()) {
    if (previos[i]) await api("PATCH", `/channels/${canalId}/messages/${previos[i].id}`, m);
    else await api("POST", `/channels/${canalId}/messages`, m);
  }
}

// ── Categorías ──────────────────────────────────────────────────────────────
const catInfo = await categoria("1554824548929507398", "📌 Yalope", 0);
const catComunidad = await categoria("1554824548929507401", "💬 Comunidad", 1);
const catVoz = await categoria("1554824549487480945", "🔊 Voz", 2);

// ── Info (solo lectura) ─────────────────────────────────────────────────────
const bienvenida = await canal({ id: "1554824548929507399", nombre: "bienvenida", padre: catInfo, soloLectura: true, posicion: 0, tema: "Qué es Yalope y por dónde empezar." });
const comoFunciona = await canal({ nombre: "cómo-funciona", padre: catInfo, soloLectura: true, posicion: 1, tema: "La app paso a paso." });
const normas = await canal({ nombre: "normas", padre: catInfo, soloLectura: true, posicion: 2, tema: "Normas de la Comunidad de Yalope." });
const anuncios = await canal({ id: "1554824548929507400", nombre: "anuncios", padre: catInfo, soloLectura: true, posicion: 3, tema: "Novedades de la app y de la comunidad." });

// ── Comunidad ───────────────────────────────────────────────────────────────
await canal({ id: "1554824548929507402", nombre: "general", padre: catComunidad, posicion: 0, tema: "Charla libre de la comunidad. Los castings y convocatorias pasan en la app: yalope.com" });
const presentate = await canal({ nombre: "presentate", padre: catComunidad, posicion: 1, tema: "Contá quién sos, qué hacés y qué buscás. Podés dejar el link de tu perfil de Yalope." });
await canal({ id: "1554824548929507403", nombre: "funciones-y-eventos", padre: catComunidad, posicion: 2, tema: "Obras en cartel, muestras, funciones y eventos de la comunidad." });
await canal({ id: "1554824549487480944", nombre: "ideas-para-yalope", padre: catComunidad, posicion: 3, tema: "Sugerencias para mejorar la app. Las leemos todas." });
await canal({ nombre: "ayuda", padre: catComunidad, posicion: 4, tema: "Dudas sobre cómo usar la app." });

// ── Voz ─────────────────────────────────────────────────────────────────────
await canal({ id: "1554824549487480946", nombre: "Charla", padre: catVoz, tipo: 2, posicion: 0 });
await canal({ id: "1554824549487480947", nombre: "Ensayo libre", padre: catVoz, tipo: 2, posicion: 1 });
await canal({ id: "1554824549487480948", nombre: "Escenario", padre: catVoz, tipo: 2, posicion: 2 });

// ── Mensajes ────────────────────────────────────────────────────────────────


await publicar(bienvenida, [
  {
    embeds: [
      {
        color: COLOR,
        title: "🎭 Te damos la bienvenida a Yalope",
        description:
          "Yalope conecta actores, actrices y quienes arman proyectos de teatro y audiovisual.\n\n" +
          "Este Discord es para **conversar, presentarse y armar grupo**. Los castings, las convocatorias y los chats de cada proyecto pasan en la app.",
        fields: [
          { name: "📲 La app", value: `[yalope.com](${APP}) — creá tu perfil, explorá proyectos y convocá talento.` },
          {
            name: "🔗 Vinculá tu Discord",
            value: "En la app: **Perfil → Vincular Discord**. Así entrás a los espacios privados de los proyectos y equipos donde participás.",
          },
          { name: "📖 Por dónde empezar", value: `<#${comoFunciona}> · <#${normas}> · y contá quién sos en <#${presentate}>` },
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
        title: "Cómo funciona Yalope",
        description: `Todo pasa en [yalope.com](${APP}). En el celular la podés instalar como app.`,
        fields: [
          {
            name: "1 · Armá tu perfil",
            value: "Tus datos, al menos una foto (mejor tres), tu experiencia y habilidades. ✨ La IA te ayuda a redactar tu experiencia y a marcar habilidades.",
          },
          { name: "2 · Explorá", value: "Deslizá proyectos y equipos que buscan gente. Tocá ❤️ **Me interesa** en los que te gusten." },
          {
            name: "3 · Convocatorias",
            value: "Cuando el interés es mutuo, aparece en **Convocatorias**. Quien armó el proyecto te convoca y, si aceptás, entrás al chat del grupo. Si cambiás de idea, te retirás desde ahí.",
          },
          {
            name: "4 · ¿Armás algo propio?",
            value: "En **Proyectos** creá tus proyectos o equipos (todos los que quieras). Desde cada uno, **Buscar talento**: podés escribir lo que buscás, por ejemplo «actriz de 30 a 40 que cante».",
          },
          {
            name: "5 · Chats y Discord",
            value: "Cada proyecto tiene su chat en la app y un espacio privado acá, en las categorías **Proyectos** y **Equipos**. Entrás vinculando tu Discord desde la app.",
          },
        ],
        footer: pie,
      },
    ],
  },
]);

const NORMAS = [
  ["Respeto entre los usuarios", "Nada de acoso, intimidación ni discriminación de ningún tipo."],
  ["Convocatorias reales y transparentes", "Información verdadera: tipo de proyecto, roles, lugar, fechas y modalidad."],
  ["Proyectos responsables", "Quien crea un proyecto o equipo responde por lo que publica y por su desarrollo."],
  ["Propiedad intelectual", "Cada persona conserva los derechos de su obra. No te apropies del trabajo ajeno."],
  ["Perfiles auténticos", "Personas reales, sin hacerse pasar por otra ni usar fotos sin autorización."],
  ["Conducta profesional", "Nada de estafas, pagos engañosos, actividades ilegales ni contenido ofensivo."],
  ["Seguridad", "No compartas datos sensibles con quien recién conocés. Los encuentros presenciales son responsabilidad de las partes."],
  ["Denuncias", "Podés denunciar perfiles, proyectos o mensajes desde la app. Analizamos cada caso."],
  ["Medidas", "Advertencias, eliminación de contenido o suspensión de la cuenta, según el caso."],
  ["Nuestra filosofía", "Crear, aprender y conectar en un entorno de confianza, respeto y creatividad."],
];
await publicar(normas, [
  {
    embeds: [
      {
        color: COLOR,
        title: "Normas de la Comunidad",
        description: `Las mismas que aceptaste en la app. El texto completo está en [yalope.com/normas](${APP}/normas).`,
        fields: NORMAS.map(([t, d], i) => ({ name: `${i + 1} · ${t}`, value: d })),
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
        description: `Algunos cambios recientes en [yalope.com](${APP}):`,
        fields: [
          { name: "Una sola app", value: "Ya no hay modo Talento y modo Creador: Explorar · Chats · Proyectos · Convocatorias · Perfil." },
          { name: "Convocatorias", value: "Dos pestañas: **Mis proyectos** (a quién convocar) y **Mis convocatorias** (donde te pueden convocar), con la opción de retirarte." },
          { name: "Sin límites", value: "Armá todos los proyectos y equipos que quieras, con los roles que necesites." },
          { name: "Alta más simple", value: "Alcanza con una foto, la fecha se escribe y lo que cargaste no se pierde si se cierra la página." },
          { name: "✨ IA", value: "Te ayuda a redactar tu experiencia y tus proyectos, sugiere habilidades y busca talento a partir de lo que escribís." },
        ],
        footer: pie,
      },
    ],
  },
]);

console.log("listo:", { bienvenida, comoFunciona, normas, anuncios });
