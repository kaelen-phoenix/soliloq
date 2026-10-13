import { NextResponse } from "next/server";
import {
  abrirEspacioDe,
  borrarCanalesDe,
  canalesParaBorrarDe,
  desvincularDiscordDe,
  sincronizarIniciativaDe,
  sincronizarMisEspacios,
  sincronizarSalaDe,
  type PermisoBorrado,
} from "@/lib/discord-acciones";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

const texto = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);

/**
 * Discord desde la app nativa (#393–#395): lo mismo que `acciones-discord.ts` de la web. `error`
 * vuelve como clave de `chats.accionesDiscord`.
 *   { accion: "mis-espacios" }                       (después de aceptar o dar de baja)
 *   { accion: "sala", salaId }
 *   { accion: "iniciativa", obraId? , equipoId? }   (después de cerrar, reabrir o desactivar)
 *   { accion: "canales-para-borrar", obraId?, equipoId? } → { ok, permiso }
 *   { accion: "borrar-canales", permiso }
 *   { accion: "abrir-espacio", salaId }              → { ok, url }
 *   { accion: "desvincular" }
 */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  const c = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const ids = { obraId: texto(c.obraId), equipoId: texto(c.equipoId) };

  switch (c.accion) {
    case "mis-espacios":
      await sincronizarMisEspacios(sesion);
      return NextResponse.json({ ok: true });
    case "sala":
      if (texto(c.salaId)) await sincronizarSalaDe(sesion, texto(c.salaId)!);
      return NextResponse.json({ ok: true });
    case "iniciativa":
      await sincronizarIniciativaDe(sesion, ids);
      return NextResponse.json({ ok: true });
    case "canales-para-borrar":
      return NextResponse.json({ ok: true, permiso: await canalesParaBorrarDe(sesion, ids) });
    case "borrar-canales":
      await borrarCanalesDe(sesion, (c.permiso ?? null) as PermisoBorrado | null);
      return NextResponse.json({ ok: true });
    case "abrir-espacio":
      return NextResponse.json(texto(c.salaId) ? await abrirEspacioDe(sesion, texto(c.salaId)!) : { ok: false, error: "errorCrear" });
    case "desvincular":
      return NextResponse.json(await desvincularDiscordDe(sesion));
  }
  return NextResponse.json({ ok: false, error: "pedido" }, { status: 400 });
}
