import { getTranslations } from "next-intl/server";
import { FormularioAjustes } from "@/components/ajustes/formulario-ajustes";
import { createClient } from "@/lib/supabase/server";
import { resolverIdioma } from "@/i18n/request";

export async function generateMetadata() {
  const t = await getTranslations("titulos");
  return { title: `${t("ajustes")} — Yalope` };
}

export default async function AjustesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("idioma, tema")
    .eq("id", user.id)
    .maybeSingle();

  const t = await getTranslations("ajustes");

  return (
    <main className="px-5 py-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-2xl">
        {t("titulo")}
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">{t("bajada")}</p>
      <FormularioAjustes
        idiomaInicial={(perfil?.idioma as "es" | "en") ?? resolverIdioma()}
        temaInicial={(perfil?.tema as "sistema" | "claro" | "oscuro") ?? "sistema"}
      />
    </main>
  );
}
