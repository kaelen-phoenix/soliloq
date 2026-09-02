import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { Logotipo } from "@/components/ui/logotipo";
import { MascarasTeatro } from "@/components/ui/mascaras-teatro";

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
    <div className="flex min-h-screen flex-col bg-[#faf5ec] text-ink-900">
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
                  Entrar
                </Link>
                <Link
                  href="/ingresar"
                  className="rounded-xl bg-candileja-400 px-3.5 py-2 text-sm font-semibold text-telon-900 transition-colors hover:bg-candileja-300"
                >
                  Crear mi perfil
                </Link>
              </nav>
            </header>

            <div className="mt-16 grid items-center gap-10 md:mt-20 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <MascarasTeatro className="h-10 w-12 text-candileja-300" />
                <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.02em] md:text-[3.4rem]">
                  El casting teatral, en tu teléfono.
                </h1>
                <p className="mt-5 max-w-prose text-lg leading-relaxed text-white/75">
                  Yalope conecta talento y creadores de teatro. Postulate a convocatorias,
                  compartí tu perfil como booking y armá elenco con un match rápido y visual.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/ingresar"
                    className="inline-flex items-center gap-2 rounded-xl bg-candileja-400 px-5 py-3 text-sm font-semibold text-telon-900 transition-colors hover:bg-candileja-300"
                  >
                    Crear mi perfil
                    <Icono nombre="flecha-derecha" className="h-4 w-4" />
                  </Link>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center rounded-xl border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Ver cómo funciona
                  </a>
                </div>
              </div>

              {/* El programa de mano: una tarjeta de talento estilizada. */}
              <div className="relative mx-auto w-full max-w-[300px]">
                <div className="rotate-1 rounded-[1.75rem] bg-[#faf5ec] p-3 shadow-tarjeta ring-1 ring-black/10">
                  <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-telon-200 via-candileja-100 to-[#faf5ec]" />
                  <div className="flex items-center justify-between px-1.5 pb-1 pt-3">
                    <div>
                      <div className="h-3 w-24 rounded-full bg-ink-300" />
                      <div className="mt-2 h-2.5 w-16 rounded-full bg-ink-200" />
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-telon-500 text-white">
                      <Icono nombre="corazon" className="h-5 w-5" relleno />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-3 -top-3 -z-10 h-full w-full -rotate-2 rounded-[1.75rem] bg-telon-700/60" />
              </div>
            </div>
          </div>
        </section>

        {/* Para quién */}
        <section className="mx-auto w-full max-w-5xl px-5 py-16">
          <div className="grid gap-4 md:grid-cols-2">
            {PARA.map((b, i) => {
              const paleta =
                i === 0
                  ? "bg-telon-50 text-telon-600"
                  : "bg-candileja-50 text-candileja-600";
              const enlace = i === 0 ? "text-telon-600 hover:text-telon-700" : "text-candileja-600 hover:text-candileja-700";
              return (
                <div
                  key={b.titulo}
                  className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-tarjeta"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${paleta}`}>
                    <Icono nombre={b.icono} className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em]">
                    {b.titulo}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{b.texto}</p>
                  <Link
                    href="/ingresar"
                    className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${enlace}`}
                  >
                    {b.cta}
                    <Icono nombre="flecha-derecha" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cómo funciona: banda cálida, con los números en rojo de marquesina. */}
        <section id="como-funciona" className="border-y border-candileja-200/60 bg-candileja-50/70">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Cómo funciona</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {PASOS.map((p) => (
                <div key={p.n}>
                  <span className="font-display text-2xl font-semibold text-telon-500">{p.n}</span>
                  <h3 className="mt-1 text-base font-semibold text-ink-900">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{p.texto}</p>
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
            <MascarasTeatro className="mx-auto h-9 w-11 text-candileja-300" />
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em]">
              Tu próximo elenco, o tu próximo papel, está a un match.
            </h2>
            <Link
              href="/ingresar"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-candileja-400 px-6 py-3 text-sm font-semibold text-telon-900 transition-colors hover:bg-candileja-300"
            >
              Sumate a Yalope
              <Icono nombre="flecha-derecha" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-[#faf5ec]">
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
