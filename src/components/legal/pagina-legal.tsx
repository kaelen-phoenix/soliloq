import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Logotipo } from "@/components/ui/logotipo";
import { SelectorIdioma } from "@/components/publico/idioma";
import { rutaPublica, type Idioma } from "@/i18n/idiomas";

type Seccion = { titulo: string; parrafos: string[] };

/** Política de Privacidad y Términos (#352): mismo formato que /normas, textos en `legal.<doc>`. */
export async function PaginaLegal({ doc, idioma }: { doc: "privacidad" | "terminos"; idioma: Idioma }) {
  const t = await getTranslations("legal");
  const secciones = t.raw(`${doc}.secciones`) as Seccion[];

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
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">{t(`${doc}.titulo`)}</h1>
        <p className="mt-2 text-xs text-ink-700">{t("actualizado")}</p>
        <p className="mt-6 text-sm leading-relaxed text-ink-700">{t(`${doc}.intro`)}</p>

        <div className="mt-8 flex flex-col gap-8">
          {secciones.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-base font-semibold text-ink-900">{s.titulo}</h2>
              {s.parrafos.map((p) => (
                <p key={p} className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-700">{t("contacto")}</p>
      </main>

      <footer className="border-t border-ink-100 bg-white">
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 py-5 text-sm text-ink-700">
          <Link href={rutaPublica(idioma, "/terminos")} className="hover:text-brand-600">{t("enlaceTerminos")}</Link>
          <Link href={rutaPublica(idioma, "/privacidad")} className="hover:text-brand-600">{t("enlacePrivacidad")}</Link>
          <Link href={rutaPublica(idioma, "/normas")} className="hover:text-brand-600">{t("enlaceNormas")}</Link>
          <SelectorIdioma idioma={idioma} ruta={`/${doc}`} className="hover:text-brand-600" />
        </nav>
      </footer>
    </div>
  );
}
