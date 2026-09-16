import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Logotipo } from "@/components/ui/logotipo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("normas");
  return {
    title: `${t("titulo")} — Yalope`,
    description: t("intro"),
    alternates: { canonical: "/normas" },
  };
}

const NUMEROS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;

export default async function NormasPage() {
  const t = await getTranslations("normas");

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

        <h2 className="mt-8 text-lg font-semibold text-ink-900">{t("bienvenida")}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{t("intro")}</p>
        <p className="mt-4 text-sm font-medium text-ink-900">{t("aceptacion")}</p>

        <div className="mt-8 flex flex-col gap-8">
          {NUMEROS.map((n) => (
            <section key={n}>
              <h2 className="text-base font-semibold text-ink-900">{t(`norma${n}Titulo`)}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {t(`norma${n}Texto`)}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
