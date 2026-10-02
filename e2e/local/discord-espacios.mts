/**
 * Espacios privados en Discord (#269), contra el Discord real. **Solo local, a mano**: crea
 * canales de verdad en el servidor de Yalope (y los borra al terminar) y usa staging para
 * los datos. Como «integrante vinculado» usa la cuenta del dueño del servidor, que ya ve todo.
 *
 * Comprueba: solo el dueño de la iniciativa crea el espacio; los dos canales (texto y voz)
 * quedan privados y en la categoría Proyectos; el integrante vinculado entra; al salir de la
 * sala pierde el acceso; con el Proyecto cerrado queda de solo lectura.
 *
 *   (env de staging: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *   DISCORD_BOT_TOKEN=… DISCORD_GUILD_ID=… DISCORD_CATEGORIA_PROYECTOS=… \
 *   DISCORD_CLIENT_ID=… DISCORD_CLIENT_SECRET=x DISCORD_CATEGORIA_EQUIPOS=x \
 *   npx tsx e2e/local/discord-espacios.mts
 */
import { createClient } from "@supabase/supabase-js";
const base = "../../src/lib/";
const { abrirEspacio, sincronizarEspacio } = await import(base + "discord-servidor.ts");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const B = process.env.DISCORD_BOT_TOKEN!, G = process.env.DISCORD_GUILD_ID!;
const d = async (p: string, o: RequestInit = {}) => { const r = await fetch("https://discord.com/api/v10" + p, { ...o, headers: { Authorization: "Bot " + B, "Content-Type": "application/json" } }); const t = await r.text(); return t ? JSON.parse(t) : null; };
const ok = (c: boolean, m: string) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
const VIEW = 1 << 10, SEND = 1 << 11, HISTORY = 1 << 16;
const owner = (await d(`/guilds/${G}`)).owner_id as string;
const mk = async (n: string) => (await admin.auth.admin.createUser({ email: `e2e-${Date.now()}-${n}@test.local`, password: "test-1234-abcd", email_confirm: true })).data.user!.id;
const A = await mk("dueno"), M = await mk("miembro");
let salaId = "", canales: string[] = [];
try {
  await admin.from("perfiles").update({ discord_user_id: owner, discord_usuario: "prueba" }).eq("id", M);
  const { data: obra } = await admin.from("obras").insert({ creador_id: A, titulo: "Prueba Discord E2E", ubicacion_texto: "x", ubicacion_lat: 0, ubicacion_lng: 0, ubicacion_pais: "AR", estado: "publicada" }).select("id").single();
  const { data: sala } = await admin.from("salas").insert({ obra_id: obra!.id }).select("id").single();
  salaId = sala!.id;
  await admin.from("sala_integrantes").insert([{ sala_id: salaId, perfil_id: A }, { sala_id: salaId, perfil_id: M }]);

  const noDueno = await abrirEspacio(salaId, M);
  ok(!noDueno.ok, "un integrante que no es el dueño no puede crear el espacio");
  const r = await abrirEspacio(salaId, A);
  ok(r.ok, "el dueño crea el espacio: " + (r.ok ? r.url : r.error));
  const { data: s } = await admin.from("salas").select("discord_canal_id, discord_voz_id").eq("id", salaId).single();
  canales = [s!.discord_canal_id, s!.discord_voz_id].filter(Boolean);
  ok(canales.length === 2, "se guardaron el canal de texto y el de voz");
  for (const c of canales) {
    const ch = await d(`/channels/${c}`);
    const todos = ch.permission_overwrites.find((o: any) => o.id === G);
    ok(!!todos && (Number(todos.deny) & VIEW) !== 0, `#${ch.name}: privado (@everyone no lo ve)`);
    const m = ch.permission_overwrites.find((o: any) => o.id === owner);
    ok(!!m && (Number(m.allow) & VIEW) !== 0 && (Number(m.allow) & SEND) !== 0, `#${ch.name}: el integrante vinculado entra y puede escribir/hablar`);
    ok(ch.parent_id === process.env.DISCORD_CATEGORIA_PROYECTOS, `#${ch.name}: en la categoría Proyectos`);
  }

  await admin.from("sala_integrantes").delete().eq("sala_id", salaId).eq("perfil_id", M);
  await sincronizarEspacio(salaId);
  for (const c of canales) ok(!(await d(`/channels/${c}`)).permission_overwrites.some((o: any) => o.id === owner), "al salir de la sala pierde el acceso");

  await admin.from("sala_integrantes").insert({ sala_id: salaId, perfil_id: M });
  await admin.from("obras").update({ estado: "cerrada" }).eq("id", obra!.id);
  await sincronizarEspacio(salaId);
  const m2 = (await d(`/channels/${canales[0]}`)).permission_overwrites.find((o: any) => o.id === owner);
  ok(!!m2 && (Number(m2.allow) & (VIEW | HISTORY)) === (VIEW | HISTORY) && (Number(m2.deny) & SEND) !== 0, "proyecto cerrado: el espacio queda de solo lectura");
} finally {
  for (const c of canales) await d(`/channels/${c}`, { method: "DELETE" });
  if (salaId) await admin.from("salas").delete().eq("id", salaId);
  await admin.from("obras").delete().eq("creador_id", A);
  for (const u of [A, M]) await admin.auth.admin.deleteUser(u);
  console.log("limpieza hecha (canales y datos de prueba borrados)");
}
