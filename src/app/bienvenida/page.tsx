import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BannerSponsors } from "@/components/apoyar/banner-sponsors";
import { Icono } from "@/components/ui/icono";
import { Logotipo, MarcaProscenio } from "@/components/ui/logotipo";

const TITULO = "Yalope — Casting teatral en tu teléfono";
const DESCRIPCION =
  "Yalope conecta talento y creadores de teatro. Postulate a convocatorias, compartí tu perfil como booking y armá elenco con un match rápido y visual.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  // La landing se sirve en `/` (rewrite para anónimos), así que esa es la URL canónica.
  alternates: { canonical: "/" },
  keywords: [
    "casting teatral",
    "convocatorias de teatro",
    "audiciones",
    "actores",
    "actrices",
    "elenco",
    "casting online",
    "teatro Argentina",
    "buscar talento teatro",
  ],
  openGraph: {
    type: "website",
    url: "https://yalope.com/",
    siteName: "Yalope",
    locale: "es_AR",
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
};

// Datos estructurados: le dan al buscador el nombre, el logo y la caja de búsqueda del sitio.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://yalope.com/#organizacion",
      name: "Yalope",
      url: "https://yalope.com",
      logo: "https://yalope.com/icons/icon-512.png",
      description: DESCRIPCION,
    },
    {
      "@type": "WebSite",
      "@id": "https://yalope.com/#sitio",
      url: "https://yalope.com",
      name: "Yalope",
      inLanguage: "es-AR",
      publisher: { "@id": "https://yalope.com/#organizacion" },
    },
  ],
};

export default async function BienvenidaPage() {
  const t = await getTranslations("landing");
  return (
    <div data-tema="light" className="flex min-h-screen flex-col bg-[#fbfaf7] text-ink-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <main className="flex-1">
        {/* Hero: el telón. Fondo rojo cortina con pliegues y el resplandor dorado de las
            candilejas subiendo desde el piso. Es la declaración de identidad de la app. */}
        <section className="relative overflow-hidden bg-telon-900 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.32) 0 2px, transparent 2px 34px)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(240,198,90,0.30), transparent 62%)",
            }}
            aria-hidden="true"
          />
          {/* Filo de candilejas al pie del escenario. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-candileja-400/70"
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-5xl px-5 pb-20 pt-6">
            <header className="flex items-center justify-between">
              <Logotipo tamano="sm" tono="claro" />
              <nav className="flex items-center gap-2">
                <Link
                  href="/ingresar"
                  className="rounded-xl px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {t("entrar")}
                </Link>
                <Link
                  href="/ingresar"
                  className="rounded-xl border border-white/30 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {t("crearPerfil")}
                </Link>
              </nav>
            </header>

            <div className="mt-16 grid items-center gap-10 md:mt-20 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <MarcaProscenio className="h-9 w-9 text-candileja-300" />
                <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.02em] md:text-[3.4rem]">
                  {t("heroTitulo")}
                </h1>
                <p className="mt-5 max-w-prose text-lg leading-relaxed text-white/75">
                  {t("heroTexto")}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/ingresar"
                    className="inline-flex items-center gap-2 rounded-xl bg-candileja-400 px-5 py-3 text-sm font-semibold text-telon-900 transition-colors hover:bg-candileja-300"
                  >
                    {t("crearPerfil")}
                    <Icono nombre="flecha-derecha" className="h-4 w-4" />
                  </Link>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center rounded-xl border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    {t("verComoFunciona")}
                  </a>
                </div>
              </div>

              {/* El programa de mano: una tarjeta de talento estilizada. */}
              <div className="relative mx-auto w-full max-w-[300px]">
                <div className="rotate-1 rounded-[1.75rem] bg-[#fbfaf7] p-3 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/10">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-b from-telon-800 to-telon-950">
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/2"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 130%, rgba(234,177,43,0.45), transparent 70%)",
                      }}
                    />
                    <MarcaProscenio className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/85" />
                  </div>
                  <div className="flex items-center justify-between px-1.5 pb-1 pt-3">
                    <div>
                      <div className="h-3 w-24 rounded-full bg-ink-200" />
                      <div className="mt-2 h-2.5 w-16 rounded-full bg-ink-100" />
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Icono nombre="corazon" className="h-5 w-5" relleno />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-3 -top-3 -z-10 h-full w-full -rotate-2 rounded-[1.75rem] bg-telon-800/50" />
              </div>
            </div>
          </div>
        </section>

        {/* Para quién */}
        <section className="mx-auto w-full max-w-5xl px-5 py-16">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Icono nombre="corazon" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em]">
                {t("paraArtistasTitulo")}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">
                {t("paraArtistasTexto")}
              </p>
              <Link
                href="/ingresar"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                {t("crearPerfil")}
                <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-white">
                <Icono nombre="buscar" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em]">
                {t("paraCreadoresTitulo")}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">
                {t("paraCreadoresTexto")}
              </p>
              <Link
                href="/ingresar"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 hover:text-ink-700"
              >
                {t("publicarConvocatoria")}
                <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Cómo funciona: banda neutra, con los números en rojo de marquesina. */}
        <section id="como-funciona" className="border-y border-ink-100 bg-[#f4f1ea]">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              {t("comoFunciona")}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n}>
                  <span className="font-display text-3xl font-semibold text-brand-600">0{n}</span>
                  <h3 className="mt-1 text-base font-semibold text-ink-900">{t(`paso${n}Titulo`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{t(`paso${n}Texto`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre: telón de nuevo, cerrando la función. */}
        <section className="relative overflow-hidden bg-telon-600 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.3) 0 2px, transparent 2px 34px)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-5xl px-5 py-20 text-center">
            <MarcaProscenio className="mx-auto h-9 w-9 text-candileja-300" />
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em]">
              {t("cierreTitulo")}
            </h2>
            <Link
              href="/ingresar"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-candileja-400 px-6 py-3 text-sm font-semibold text-telon-900 transition-colors hover:bg-candileja-300"
            >
              {t("sumate")}
              <Icono nombre="flecha-derecha" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-[#fbfaf7]">
        <div className="mx-auto w-full max-w-5xl px-5 py-8">
          <BannerSponsors niveles={["produccion"]} className="mb-6" />
          <div className="flex flex-col items-start gap-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between">
            <Logotipo tamano="sm" />
            <p>{t("pieLema")}</p>
            <div className="flex gap-4">
              <Link href="/apoyar" className="font-medium text-ink-900 hover:text-brand-600">
                {t("apoyarEnlace")}
              </Link>
              <Link href="/ingresar" className="font-medium text-ink-900 hover:text-brand-600">
                {t("entrar")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
