import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { discordConfigurado, sincronizarLogros } from "@/lib/discord-servidor";

/**
 * Una vez por día (vercel.json → crons) repasa los logros de Discord (#336) de todas las
 * cuentas vinculadas: algunos cambian sin pasar por una acción que los sincronice (completar
 * el perfil, publicar un proyecto). Vercel manda `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!discordConfigurado()) return NextResponse.json({ revisadas: 0 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("perfiles").select("id").not("discord_user_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let fallidas = 0;
  for (const { id } of data ?? []) {
    await sincronizarLogros(id).catch(() => {
      fallidas++;
    });
  }
  return NextResponse.json({ revisadas: data?.length ?? 0, fallidas });
}
