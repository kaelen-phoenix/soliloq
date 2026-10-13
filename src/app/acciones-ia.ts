"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  borradorSaludoDe,
  interpretarBusquedaDe,
  mejorarRedaccionDe,
  sugerirHabilidadesDe,
  type ErrorIa,
  type FiltrosBusqueda,
} from "@/lib/ia-acciones";
import type { TipoRedaccion } from "@/lib/ia-prompts";

export type { FiltrosBusqueda } from "@/lib/ia-acciones";

/**
 * Las funciones de IA de la web. La lógica vive en `@/lib/ia-acciones`, que usa también la app
 * nativa (`/api/app/ia`); acá se resuelve la sesión de las cookies y se traduce el error.
 */
async function sesion() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function traducir(error: ErrorIa) {
  const t = await getTranslations("admin.ia");
  return t(error.clave, error.valores);
}

/** «✨ Mejorar redacción» (#313, #319). */
export async function mejorarRedaccion(
  texto: string,
  tipo: TipoRedaccion = "experiencia",
): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: await traducir({ clave: "sinSesion" }) };
  const r = await mejorarRedaccionDe(supabase, texto, tipo);
  return r.ok ? r : { ok: false, error: await traducir(r.error) };
}

/** «Sugerir habilidades» (#320). */
export async function sugerirHabilidades(
  texto: string,
): Promise<{ ok: true; habilidades: string[] } | { ok: false; error: string }> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: await traducir({ clave: "sinSesion" }) };
  const r = await sugerirHabilidadesDe(supabase, texto);
  return r.ok ? r : { ok: false, error: await traducir(r.error) };
}

/** «Buscar escribiendo» (#321). */
export async function interpretarBusqueda(
  consulta: string,
): Promise<{ ok: true; filtros: FiltrosBusqueda } | { ok: false; error: string }> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: await traducir({ clave: "sinSesion" }) };
  const r = await interpretarBusquedaDe(supabase, consulta);
  return r.ok ? r : { ok: false, error: await traducir(r.error) };
}

/** «✨ Escribir un saludo» en el chat de un Proyecto o Equipo propio (#322). */
export async function borradorSaludo(salaId: string): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: await traducir({ clave: "sinSesion" }) };
  const r = await borradorSaludoDe(supabase, user, salaId);
  return r.ok ? r : { ok: false, error: await traducir(r.error) };
}
