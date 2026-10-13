import { NextResponse } from "next/server";
import { borradorSaludoDe, interpretarBusquedaDe, mejorarRedaccionDe, sugerirHabilidadesDe } from "@/lib/ia-acciones";
import type { TipoRedaccion } from "@/lib/ia-prompts";
import { sinSesion, usuarioDesdeApp } from "@/lib/supabase/desde-app";

const texto = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * La IA desde la app nativa (#395): lo mismo que `acciones-ia.ts`. El error vuelve como
 * `{ clave, valores }` de `admin.ia`, y la app lo traduce.
 *   { accion: "mejorar", texto, tipo }  → { ok, texto }
 *   { accion: "habilidades", texto }    → { ok, habilidades }
 *   { accion: "busqueda", consulta }    → { ok, filtros }
 *   { accion: "saludo", salaId }        → { ok, texto }
 */
export async function POST(request: Request) {
  const sesion = await usuarioDesdeApp(request);
  if (!sesion) return sinSesion();
  const c = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const { supabase, user } = sesion;
  switch (c.accion) {
    case "mejorar":
      return NextResponse.json(await mejorarRedaccionDe(supabase, texto(c.texto), texto(c.tipo, 40) as TipoRedaccion));
    case "habilidades":
      return NextResponse.json(await sugerirHabilidadesDe(supabase, texto(c.texto)));
    case "busqueda":
      return NextResponse.json(await interpretarBusquedaDe(supabase, texto(c.consulta, 1000)));
    case "saludo":
      return NextResponse.json(await borradorSaludoDe(supabase, user, texto(c.salaId, 64)));
  }
  return NextResponse.json({ ok: false, error: { clave: "errorGenerico" } }, { status: 400 });
}
