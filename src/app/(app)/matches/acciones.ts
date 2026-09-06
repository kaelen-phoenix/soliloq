"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { iniciativaActivaDelCreador } from "@/lib/iniciativa-servidor";

type Resultado = { ok: true } | { ok: false; error: string };

/** El Creador convoca a un talento matcheado (issue #105). */
export async function convocarMatch(matchId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("convocar", { p_match_id: matchId });
  if (error) {
    const m = error.message ?? "";
    return {
      ok: false,
      error: m.includes("cupo_lleno")
        ? "Ya llenaste el cupo. Liberá un lugar para convocar a otra persona."
        : m.includes("venció")
          ? "El match venció."
          : m.includes("ya está convocado")
            ? "Ya la convocaste."
            : "No se pudo convocar. Probá de nuevo.",
    };
  }
  revalidatePath("/matches");
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
