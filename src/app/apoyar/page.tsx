import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BannerSponsors } from "@/components/apoyar/banner-sponsors";
import { FormularioContacto } from "@/components/apoyar/formulario-contacto";
import { Icono } from "@/components/ui/icono";
import { Logotipo, MarcaProscenio } from "@/components/ui/logotipo";

// Plataforma de donación. Cambiar por la URL real (Cafecito, MercadoPago, Ko-fi…).
const DONACION_URL = "https://cafecito.app/yalope";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apoyar");
  return {
    title: `${t("titulo")} — Yalope`,
    description: t("intro"),
    alternates: { canonical: "/apoyar" },
  };
}

const NIVELES = ["reparto", "coproduccion", "produccion"] as const;

export default async function ApoyarPage() {
  const t = await getTranslations("apoyar");

  const destinos = [t("destino1"), t("destino2"), t("destino3")];

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf7] text-ink-900">
      {/* Cabecera: el mismo escenario oscuro que la portada. */}
      <section className="relative overflow-hidden bg-telon-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.32) 0 2px, transparent 2px 34px)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "radial-gradient(ellipse at 50% 130%, rgba(234,177,43,0.22), transparent 65%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-3xl px-5 pb-14 pt-6">
          <header className="flex items-center justify-between">
            <Link href="/" aria-label="Yalope">
              <Logotipo tamano="sm" tono="claro" />
            </Link>
            <Link
              href="/ingresar"
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {t("volverApp")}
            </Link>
          </header>

          <div className="mt-12">
            <MarcaProscenio className="h-8 w-8 text-candileja-300" />
            <h1 className="mt-4 font-display text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] md:text-[2.75rem]">
              {t("titulo")}
            </h1>
            <p className="mt-3 max-w-prose text-lg leading-relaxed text-white/75">{t("intro")}</p>
            <ul className="mt-5 flex flex-col gap-2.5 text-sm text-white/80">
              {destinos.map((d) => (
                <li key={d} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-candileja-400"
                  />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-10">
        {/* Donación */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("donarTitulo")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{t("donarTexto")}</p>
          <a
            href={DONACION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {t("donarCta")}
            <Icono nombre="flecha-derecha" className="h-4 w-4" />
          </a>
        </section>

        {/* Sponsors */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("sponsorsTitulo")}</h2>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-700">{t("sponsorsTexto")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {NIVELES.map((n, i) => (
              <div
                key={n}
                className={`flex flex-col rounded-2xl border p-5 ${
                  i === 2 ? "border-brand-500/40 bg-brand-500/5" : "border-ink-100 bg-white"
                }`}
              >
                <p className="font-display text-lg font-semibold text-ink-900">{t(`nivel_${n}_nombre`)}</p>
                <p className="mt-0.5 text-sm font-semibold text-brand-600">{t(`nivel_${n}_precio`)}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{t(`nivel_${n}_beneficio`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-700">{t("sponsorsComo")}</p>
        </section>

        {/* Contacto */}
        <section className="mt-10 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("contactoTitulo")}</h2>
          <p className="mb-4 mt-1.5 text-sm leading-relaxed text-ink-700">{t("contactoTexto")}</p>
          <FormularioContacto />
        </section>

        {/* Gracias a */}
        <section className="mt-12">
          <BannerSponsors />
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-[#fbfaf7]">
        <div className="mx-auto w-full max-w-3xl px-5 py-6 text-sm">
          <Link href="/" className="font-medium text-ink-900 hover:text-brand-600">
            {t("volverInicio")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
