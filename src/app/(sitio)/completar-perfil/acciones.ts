"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fotoDeGoogle as fotoDeGoogleDe, importarFotoDeGoogleDe } from "@/lib/foto-google-servidor";

type Resultado =
  | { ok: true; storage_path: string; url: string }
  | { ok: false; error: string };

/** La foto de la cuenta de Google, si entró con Google: solo de los servidores de Google. */
export async function fotoDeGoogle(metadata: Record<string, unknown> | undefined): Promise<string | null> {
  return fotoDeGoogleDe(metadata);
}

/**
 * «Usar mi foto de Google» en el alta (#303). La lógica es la misma que usa la app nativa
 * (`importarFotoDeGoogleDe`); acá solo se traduce el error.
 */
export async function importarFotoDeGoogle(): Promise<Resultado> {
  const t = await getTranslations("perfil.completar.errores");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("sinSesion") };
  const r = await importarFotoDeGoogleDe(supabase, user);
  return r.ok ? r : { ok: false, error: t(r.error) };
}
