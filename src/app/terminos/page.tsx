import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaginaLegal } from "@/components/legal/pagina-legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terminos");
  return {
    title: `${t("titulo")} — Yalope`,
    description: t("descripcion"),
    alternates: { canonical: "/terminos" },
  };
}

export default function TerminosPage() {
  return <PaginaLegal doc="terminos" />;
}
