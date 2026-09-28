import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { FormularioAjustes } from "@/components/ajustes/formulario-ajustes";
import { createClient } from "@/lib/supabase/server";
import { resolverIdioma } from "@/i18n/request";

export async function generateMetadata() {
  const t = await getTranslations("titulos");
  return { title: `${t("ajustes")} — Yalope` };
}

type Tema = "sistema" | "claro" | "oscuro";

/** El tema que de verdad se está viendo en este dispositivo, con la misma regla que
 *  `SCRIPT_TEMA` (`layout.tsx`): manda la cookie, y sin cookie la app es oscura (#217).
 *  `perfiles.tema` no sirve para esto: nace en 'sistema' para todos, elegido o no. */
function temaVigente(): Tema {
  const cookie = cookies().get("tema")?.value;
  return cookie === "sistema" || cookie === "claro" || cookie === "oscuro" ? cookie : "oscuro";
}

export default async function AjustesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("idioma")
    .eq("id", user.id)
    .maybeSingle();

  const t = await getTranslations("ajustes");

  return (
    <main className="px-5 py-5">
      <p className="mb-6 text-sm text-texto-tenue">{t("bajada")}</p>
      <FormularioAjustes
        idiomaInicial={(perfil?.idioma as "es" | "en") ?? resolverIdioma()}
        temaInicial={temaVigente()}
      />
    </main>
  );
}
