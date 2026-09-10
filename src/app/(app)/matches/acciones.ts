"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";

type Resultado = { ok: true } | { ok: false; error: string };

/** El Creador acepta el Match → el talento pasa a Convocados. Sin notificación (#143). */
export async function aceptarMatch(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("aceptar_match", { p_match_id: matchId });
  if (error) {
    const m = error.message ?? "";
    return {
      ok: false,
      error: m.includes("cupo_lleno")
        ? "Ya llenaste el cupo. Liberá un lugar para sumar a otra persona."
        : m.includes("venció")
          ? "El match venció."
          : "No se pudo aceptar. Probá de nuevo.",
    };
  }
  revalidatePath("/matches");
  return { ok: true };
}

/** El Creador convoca (definitivo) a alguien de Convocados: recién acá se notifica al talento (#143). */
export async function convocarMatch(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("convocar", { p_match_id: matchId });
  if (error) {
    const m = error.message ?? "";
    return {
      ok: false,
      error: m.includes("cupo_lleno")
        ? "Ya llenaste el cupo. Liberá un lugar para convocar a otra persona."
        : m.includes("primero aceptá")
          ? "Primero aceptá el match."
          : m.includes("ya está convocado")
            ? "Ya la convocaste."
            : "No se pudo convocar. Probá de nuevo.",
    };
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
    return {
      ok: false,
      error: m.includes("ya aceptó")
        ? "Ya aceptó y está en la sala: usá «Dar de baja»."
        : "No se pudo descartar. Probá de nuevo.",
    };
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
  if (error) return { ok: false, error: "No se pudo dar de baja. Probá de nuevo." };
  revalidatePath("/matches");
  revalidatePath("/salas");
  return { ok: true };
}

/**
 * El Creador marca (o desmarca) "Me interesa" en un talento, hacia su iniciativa activa
 * (issue #105).
 */
export async function marcarInteresEnTalento(
  talentoId: string,
  interesa: boolean,
): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const iniciativa = await iniciativaActivaDelCreador(supabase, user.id);
  if (!iniciativa) {
    return { ok: false, error: "Creá un proyecto o equipo antes de marcar interés." };
  }

  const { error } = await supabase.rpc("marcar_interes", {
    p_a_perfil: talentoId,
    p_obra_id: iniciativa.tipo === "obra" ? iniciativa.id : null,
    p_equipo_id: iniciativa.tipo === "equipo" ? iniciativa.id : null,
    p_interesa: interesa,
  });
  if (error) return { ok: false, error: "No se pudo aplicar. Probá de nuevo." };

  revalidatePath(`/talentos/${talentoId}`);
  revalidatePath("/matches");
  return { ok: true };
}
