import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BannerSponsors } from "@/components/apoyar/banner-sponsors";
import { FormularioContacto } from "@/components/apoyar/formulario-contacto";
import { Icono } from "@/components/ui/icono";
import { Logotipo } from "@/components/ui/logotipo";

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

  return (
    <div className="flex min-h-screen flex-col bg-[#faf5ec] text-ink-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Yalope">
          <Logotipo tamano="sm" />
        </Link>
        <Link href="/ingresar" className="text-sm font-medium text-ink-600 hover:text-ink-900">
          {t("volverApp")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16">
        {/* Intro */}
        <section className="py-8">
          <h1 className="font-display text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] text-ink-900">
            {t("titulo")}
          </h1>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-600">{t("intro")}</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-600">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-brand-500">
                ·
              </span>
              {t("destino1")}
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-brand-500">
                ·
              </span>
              {t("destino2")}
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-brand-500">
                ·
              </span>
              {t("destino3")}
            </li>
          </ul>
        </section>

        {/* Donación */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("donarTitulo")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{t("donarTexto")}</p>
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
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-600">{t("sponsorsTexto")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {NIVELES.map((n) => (
              <div key={n} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5">
                <p className="font-display text-lg font-semibold text-ink-900">{t(`nivel_${n}_nombre`)}</p>
                <p className="mt-0.5 text-sm font-medium text-brand-600">{t(`nivel_${n}_precio`)}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{t(`nivel_${n}_beneficio`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-500">{t("sponsorsComo")}</p>
        </section>

        {/* Contacto */}
        <section className="mt-10 rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{t("contactoTitulo")}</h2>
          <p className="mb-4 mt-1.5 text-sm leading-relaxed text-ink-600">{t("contactoTexto")}</p>
          <FormularioContacto />
        </section>

        {/* Gracias a */}
        <section className="mt-12">
          <BannerSponsors />
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-[#faf5ec]">
        <div className="mx-auto w-full max-w-3xl px-5 py-6 text-sm text-ink-500">
          <Link href="/" className="font-medium text-ink-700 hover:text-ink-900">
            {t("volverInicio")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
