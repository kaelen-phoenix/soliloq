import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extraerDeCV,
  MAX_BYTES_DOC,
  MIMES_ACEPTADOS,
} from "@/lib/extraccion-cv";

// El parseo de PDF/DOCX necesita el runtime de Node (no Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recibe un CV, extrae lo que puede en memoria y lo devuelve. El archivo no se guarda. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "archivo", campos: {}, marcados: [] });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "archivo", campos: {}, marcados: [] });
  }
  if (!MIMES_ACEPTADOS.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "formato", campos: {}, marcados: [] });
  }
  if (file.size > MAX_BYTES_DOC) {
    return NextResponse.json({ ok: false, error: "tamaño", campos: {}, marcados: [] });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await extraerDeCV(buffer, file.type);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ ok: false, campos: {}, marcados: [] });
  }
}
