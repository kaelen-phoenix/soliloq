import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { Logotipo } from "@/components/ui/logotipo";

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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Yalope" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/og.png"],
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
      logo: "https://yalope.com/og.png",
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

const PARA = [
  {
    icono: "corazon" as const,
    titulo: "Si actuás, dirigís o hacés que la obra pase",
    texto:
      "Un perfil que se comparte como booking: fotos, videoreel, experiencia y un enlace para pasarle a cualquier casting, sin que tengan que crear cuenta.",
    cta: "Crear mi perfil",
  },
  {
    icono: "buscar" as const,
    titulo: "Si estás armando un proyecto",
    texto:
      "Publicá la convocatoria y recibí postulaciones con la foto primero. O salí a buscar talento por edad, zona y habilidades.",
    cta: "Publicar una convocatoria",
  },
];

const PASOS = [
  {
    n: "01",
    titulo: "Armá tu perfil",
    texto: "Fotos, experiencia, habilidades y redes. Diez minutos y queda listo para compartir.",
  },
  {
    n: "02",
    titulo: "Encontrá o publicá",
    texto:
      "Deslizá convocatorias que te sirven, o publicá la tuya y mirá quién se anota. También podés buscar gente para armar equipo sin una obra de por medio.",
  },
  {
    n: "03",
    titulo: "Cuando hay match, hablan",
    texto:
      "El interés es mutuo y a ciegas: recién cuando los dos dicen que sí se abre una sala para escribirse.",
  },
];

export default function BienvenidaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Logotipo tamano="sm" />
        <nav className="flex items-center gap-2">
          <Link
            href="/ingresar"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            Entrar
          </Link>
          <Link
            href="/ingresar"
            className="rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Crear mi perfil
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="superficie-portada">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <div>
              <h1 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-900 md:text-[3.25rem]">
                El casting teatral, en tu teléfono.
              </h1>
              <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-600">
                Yalope conecta talento y creadores de teatro. Postulate a convocatorias,
                compartí tu perfil como booking y armá elenco con un match rápido y visual.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/ingresar"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  Crear mi perfil
                  <Icono nombre="flecha-derecha" className="h-4 w-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center rounded-xl border border-ink-200 px-5 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>

            {/* Mock de tarjeta: sin assets, todo con cajas. */}
            <div className="relative mx-auto w-full max-w-[300px]">
              <div className="rounded-[1.75rem] border border-ink-100 bg-white p-3 shadow-tarjeta">
                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-brand-100 via-ink-50 to-white" />
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
              <div className="absolute -right-4 -top-4 -z-10 h-full w-full rounded-[1.75rem] border border-ink-100 bg-ink-50" />
            </div>
          </div>
        </section>

        {/* Para quién */}
        <section className="mx-auto w-full max-w-5xl px-5 py-16">
          <div className="grid gap-4 md:grid-cols-2">
            {PARA.map((b) => (
              <div
                key={b.titulo}
                className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icono nombre={b.icono} className="h-5 w-5" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em]">
                  {b.titulo}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{b.texto}</p>
                <Link
                  href="/ingresar"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {b.cta}
                  <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="border-y border-ink-100 bg-ink-50/60">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Cómo funciona
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {PASOS.map((p) => (
                <div key={p.n}>
                  <span className="font-display text-lg font-semibold text-brand-500">{p.n}</span>
                  <h3 className="mt-1 text-base font-semibold text-ink-900">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="mx-auto w-full max-w-5xl px-5 py-20 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em]">
            Tu próximo elenco, o tu próximo papel, está a un match.
          </h2>
          <Link
            href="/ingresar"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Sumate a Yalope
            <Icono nombre="flecha-derecha" className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 px-5 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <Logotipo tamano="sm" />
          <p>Match teatral · Hecho en Argentina</p>
          <Link href="/ingresar" className="font-medium text-ink-700 hover:text-ink-900">
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}
