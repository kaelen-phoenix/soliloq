import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { alternativasIdioma, fijarIdioma } from "@/components/publico/idioma";
import { esIdioma } from "@/i18n/idiomas";

type Props = { params: { idioma: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: esIdioma(params.idioma) ? params.idioma : "es", namespace: "legal.terminos" });
  return {
    title: `${t("titulo")} — Yalope`,
    description: t("descripcion"),
    alternates: alternativasIdioma(esIdioma(params.idioma) ? params.idioma : "es", "/terminos"),
  };
}

export default function TerminosPage({ params }: Props) {
  const idioma = fijarIdioma(params.idioma);
  return <PaginaLegal doc="terminos" idioma={idioma} />;
}
