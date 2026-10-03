"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sincronizarEspaciosDe } from "@/lib/discord-servidor";
import { iniciativaParaBuscar } from "@/lib/iniciativa-servidor";
import { reportarErrorSupabase } from "@/lib/observabilidad";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * El Creador cierra el aviso de "¡Tenés un Match!" (issue #194). Solo marca el aviso como
 * visto — no convoca a nadie: el match ya está en
 * Matches por el solo hecho de existir.
 */
export async function marcarMatchMostrado(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("marcar_match_mostrado", { p_match_id: matchId });
  if (error) {
    reportarErrorSupabase(error, { rpc: "marcar_match_mostrado", matchId });
    return { ok: false, error: "No se pudo cerrar el aviso." };
  }
  return { ok: true };
}


/**
 * El Creador convoca (definitivo) a alguien de Convocados: recién acá se notifica al
 * talento (#143). `rolId` es el rol del Proyecto al que queda asociado (#152) — null para
 * un Equipo, o para un Proyecto con un solo rol donde no hace falta elegir.
 */
export async function convocarMatch(matchId: string, rolId?: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("convocar", { p_match_id: matchId, p_rol_id: rolId ?? null });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("rol_lleno")) return { ok: false, error: "Ese rol ya está cubierto. Elegí otro." };
    if (m.includes("rol inválido")) return { ok: false, error: "Elegí un rol válido." };
    if (m.includes("cupo_lleno")) {
      return {
        ok: false,
        error: "Ya llenaste el cupo. Liberá un lugar para convocar a otra persona.",
      };
    }
    if (m.includes("primero aceptá")) return { ok: false, error: "Primero aceptá el match." };
    if (m.includes("ya está convocado")) return { ok: false, error: "Ya la convocaste." };
    reportarErrorSupabase(error, { rpc: "convocar", matchId, rolId });
    return { ok: false, error: "No se pudo convocar. Probá de nuevo." };
  }
  revalidatePath("/matches");
  return { ok: true };
}

/** El Creador descarta a alguien de Convocados antes de que acepte (#143). */
export async function descartarConvocado(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("descartar_convocado", { p_match_id: matchId });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("ya aceptó")) {
      return { ok: false, error: "Ya aceptó y está en la sala: usá «Dar de baja»." };
    }
    reportarErrorSupabase(error, { rpc: "descartar_convocado", matchId });
    return { ok: false, error: "No se pudo descartar. Probá de nuevo." };
  }
  revalidatePath("/matches");
  return { ok: true };
}

/** El Creador da de baja a un convocado ya aceptado: libera el lugar (issue #107). */
export async function darDeBajaConvocado(convocatoriaId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("dar_de_baja_convocado", {
    p_convocatoria_id: convocatoriaId,
  });
  if (error) {
    reportarErrorSupabase(error, { rpc: "dar_de_baja_convocado", convocatoriaId });
    return { ok: false, error: "No se pudo dar de baja. Probá de nuevo." };
  }
  // Quien da de baja es el dueño, que está en todas sus salas: sincronizar las suyas saca a
  // la persona dada de baja del espacio en Discord (#269).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await sincronizarEspaciosDe(user.id).catch(() => {});
  revalidatePath("/matches");
  revalidatePath("/salas");
  return { ok: true };
}

/**
 * El Creador marca (o desmarca) "Me interesa" en un talento, hacia el Proyecto o Equipo
 * para el que está buscando (#294; antes, siempre su iniciativa activa, #105).
 */
export async function marcarInteresEnTalento(
  talentoId: string,
  interesa: boolean,
  para?: { tipo: "obra" | "equipo"; id: string },
): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const iniciativa = await iniciativaParaBuscar(supabase, user.id, {
    obra: para?.tipo === "obra" ? para.id : null,
    equipo: para?.tipo === "equipo" ? para.id : null,
  });
  if (!iniciativa) {
    return { ok: false, error: "Creá un proyecto o equipo antes de marcar interés." };
  }

  const { error } = await supabase.rpc("marcar_interes", {
    p_a_perfil: talentoId,
    p_obra_id: iniciativa.tipo === "obra" ? iniciativa.id : null,
    p_equipo_id: iniciativa.tipo === "equipo" ? iniciativa.id : null,
    p_interesa: interesa,
  });
  if (error) {
    reportarErrorSupabase(error, { rpc: "marcar_interes", talentoId, userId: user.id });
    return { ok: false, error: "No se pudo aplicar. Probá de nuevo." };
  }

  revalidatePath(`/talentos/${talentoId}`);
  revalidatePath("/matches");
  return { ok: true };
}

/** El Talento se baja de un match o de una convocatoria todavía sin responder (#298). */
export async function retirarmeDeMatch(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("retirarme_de_match", { p_match_id: matchId });
  if (error) {
    if (error.message?.includes("ya estás en el chat")) {
      return { ok: false, error: "Ya estás en el chat: usá «Salir del chat»." };
    }
    reportarErrorSupabase(error, { rpc: "retirarme_de_match", matchId });
    return { ok: false, error: "No se pudo aplicar. Probá de nuevo." };
  }
  revalidatePath("/matches");
  revalidatePath("/convocatoria");
  return { ok: true };
}
