import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { Documento, metadatosBase } from "../_documento";
import { esIdioma } from "@/i18n/idiomas";

export { viewport } from "../_documento";

/**
 * Layout raíz de la app (#237): todo lo que no es una página pública por idioma. El idioma
 * sale de Ajustes (cookie `NEXT_LOCALE`) o del navegador, y por eso estas páginas se arman en
 * cada request. Las públicas tienen su propio layout raíz en `app/[idioma]/layout.tsx`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return metadatosBase(esIdioma(locale) ? locale : "es");
}

export default async function LayoutSitio({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <Documento idioma={esIdioma(locale) ? locale : "es"} mensajes={messages}>
      {children}
    </Documento>
  );
}
