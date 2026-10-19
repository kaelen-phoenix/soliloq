import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import { Logotipo } from "@/components/ui/logotipo";
import { SelectorIdioma, alternativasIdioma, fijarIdioma } from "@/components/publico/idioma";
import { esIdioma } from "@/i18n/idiomas";
import { GRUPO_TESTERS, PLAY_STORE, PRUEBA_INTERNA } from "@/lib/descarga-app";

type Props = { params: { idioma: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const idioma = esIdioma(params.idioma) ? params.idioma : "es";
  const t = await getTranslations({ locale: idioma, namespace: "descargarApp" });
  return {
    title: `${t("metaTitulo")} — Yalope`,
    description: t("metaDescripcion"),
    alternates: alternativasIdioma(idioma, "/descargar"),
  };
}

/**
 * Descargar la app de Android (#425). Mientras está en prueba interna de Google Play son dos
 * pasos con la cuenta de Google del teléfono: unirse al grupo abierto de testers y aceptar la
 * prueba. Cuando se publique, esta página se reduce al botón de Google Play.
 */
export default async function DescargarPage({ params }: Props) {
  const idioma = fijarIdioma(params.idioma);
  const t = await getTranslations("descargarApp");

  const paso = (n: number, titulo: string, texto: string, href: string, boton: string) => (
    <li className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accion text-sm font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/70">{texto}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="brillo-accion mt-4 inline-flex items-center gap-2 rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {boton}
          <Icono nombre="flecha-derecha" className="h-4 w-4" />
        </a>
      </div>
    </li>
  );

  return (
    <div data-tema="dark" className="flex min-h-screen flex-col bg-superficie text-white">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Yalope">
          <Logotipo tamano="sm" tono="claro" />
        </Link>
        <Link href="/" className="text-sm font-medium text-white/70 hover:text-white">
          {t("volver")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-12 pt-4">
        <Icono nombre="android" className="h-10 w-10 text-brand-400" />
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em]">{t("titulo")}</h1>
        <p className="mt-3 text-base leading-relaxed text-white/75">{t("bajada")}</p>
        <p className="mt-3 rounded-xl border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/70">
          {t("cuentaGoogle")}
        </p>

        <ol className="mt-6 flex flex-col gap-3">
          {paso(1, t("paso1Titulo"), t("paso1Texto"), GRUPO_TESTERS, t("paso1Boton"))}
          {paso(2, t("paso2Titulo"), t("paso2Texto"), PRUEBA_INTERNA, t("paso2Boton"))}
        </ol>

        <p className="mt-6 text-sm text-white/70">
          {t("yaLaTengo")}{" "}
          <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-4">
            {t("abrirPlay")}
          </a>
        </p>
        <p className="mt-6 text-sm leading-relaxed text-white/55">{t("iphone")}</p>

        <nav className="mt-10 text-sm text-white/70">
          <SelectorIdioma idioma={idioma} ruta="/descargar" className="hover:text-white" />
        </nav>
      </main>
    </div>
  );
}
