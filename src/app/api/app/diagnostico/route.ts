import { NextResponse } from "next/server";

/**
 * Diagnóstico de la app nativa (#406): la app manda qué pasa adentro del teléfono (pedidos,
 * tiempos, errores) y queda en los logs del servidor (Vercel). Sin sesión a propósito: tiene que
 * llegar aunque el cliente de Supabase de la app esté trabado. No guarda nada; tope de tamaño, y
 * el firewall de Vercel ya limita los POST por IP.
 */
export async function POST(request: Request) {
  const texto = await request.text();
  if (texto.length > 30_000) return NextResponse.json({ ok: false }, { status: 413 });
  try {
    const { id, version, eventos } = JSON.parse(texto) as { id?: string; version?: string; eventos?: unknown[] };
    if (typeof id !== "string" || !Array.isArray(eventos)) return NextResponse.json({ ok: false }, { status: 400 });
    console.log(`[diag-app] ${id.slice(0, 12)} ${String(version).slice(0, 40)} ${JSON.stringify(eventos).slice(0, 25_000)}`);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
