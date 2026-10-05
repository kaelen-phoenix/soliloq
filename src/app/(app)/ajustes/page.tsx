import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FormularioAjustes } from "@/components/ajustes/formulario-ajustes";
import { createClient } from "@/lib/supabase/server";
import { resolverIdioma } from "@/i18n/request";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";

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
  const user = await usuarioDeLaRequest();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("idioma")
    .eq("id", user.id)
    .maybeSingle();

  const t = await getTranslations("ajustes");
  const tLegal = await getTranslations("legal");

  return (
    <main className="px-5 py-5">
      <p className="mb-6 text-sm text-texto-tenue">{t("bajada")}</p>
      <FormularioAjustes
        idiomaInicial={(perfil?.idioma as "es" | "en") ?? resolverIdioma()}
        temaInicial={temaVigente()}
      />
      <nav className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-texto-tenue">
        <Link href="/terminos" className="underline underline-offset-4 hover:text-texto">
          {tLegal("enlaceTerminos")}
        </Link>
        <Link href="/privacidad" className="underline underline-offset-4 hover:text-texto">
          {tLegal("enlacePrivacidad")}
        </Link>
        <Link href="/normas" className="underline underline-offset-4 hover:text-texto">
          {tLegal("enlaceNormas")}
        </Link>
      </nav>
    </main>
  );
}
