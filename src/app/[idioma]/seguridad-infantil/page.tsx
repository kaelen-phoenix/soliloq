import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Logotipo } from "@/components/ui/logotipo";
import { SelectorIdioma, alternativasIdioma, fijarIdioma } from "@/components/publico/idioma";
import { esIdioma, rutaPublica } from "@/i18n/idiomas";

type Props = { params: { idioma: string } };

type Seccion = { titulo: string; texto: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const idioma = esIdioma(params.idioma) ? params.idioma : "es";
  const t = await getTranslations({ locale: idioma, namespace: "seguridadInfantil" });
  return {
    title: `${t("titulo")} — Yalope`,
    description: t("metaDescripcion"),
    alternates: alternativasIdioma(idioma, "/seguridad-infantil"),
  };
}

/**
 * Estándares contra la explotación y el abuso sexual infantil (CSAE, #431). Google Play pide un
 * enlace público a esta página; completa las Normas de la Comunidad y los Términos.
 */
export default async function SeguridadInfantilPage({ params }: Props) {
  const idioma = fijarIdioma(params.idioma);
  const t = await getTranslations("seguridadInfantil");
  const tLegal = await getTranslations("legal");
  const tNormas = await getTranslations("normas");
  const secciones = t.raw("secciones") as Seccion[];

  return (
    <div data-tema="light" className="flex min-h-screen flex-col bg-[#fbfaf7] text-ink-900">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
          <Link href="/" aria-label="Yalope">
            <Logotipo tamano="sm" />
          </Link>
          <Link href="/" className="text-sm font-medium text-ink-700 hover:text-brand-600">
            {t("volverApp")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">{t("titulo")}</h1>
        <p className="mt-2 text-xs text-ink-500">{t("actualizado")}</p>
        <p className="mt-6 text-sm leading-relaxed text-ink-700">{t("intro")}</p>

        <div className="mt-8 flex flex-col gap-8">
          {secciones.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-base font-semibold text-ink-900">{s.titulo}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{s.texto}</p>
            </section>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-700">
          <Link href={rutaPublica(idioma, "/normas")} className="hover:text-brand-600">{tNormas("titulo")}</Link>
          <Link href={rutaPublica(idioma, "/terminos")} className="hover:text-brand-600">{tLegal("enlaceTerminos")}</Link>
          <Link href={rutaPublica(idioma, "/privacidad")} className="hover:text-brand-600">{tLegal("enlacePrivacidad")}</Link>
          <SelectorIdioma idioma={idioma} ruta="/seguridad-infantil" className="hover:text-brand-600" />
        </nav>
      </main>
    </div>
  );
}
