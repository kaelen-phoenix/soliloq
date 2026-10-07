import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Documento, metadatosBase } from "../_documento";
import { IDIOMAS, esIdioma } from "@/i18n/idiomas";
import { mensajesDe, resolverIdioma } from "@/i18n/request";

export { viewport } from "../_documento";

/**
 * Layout raíz de las páginas públicas con el idioma en la URL (#237): portada, Normas,
 * Apoyar, Privacidad y Términos. El idioma sale del segmento (`/es/…` por dentro, `/en/…`),
 * no de cookies ni headers, así que cada página se arma una vez por idioma en el build y se
 * sirve desde la caché. El middleware decide a qué idioma va quien entra sin prefijo.
 *
 * Una URL inventada (`/algo`) también cae acá, con `idioma = "algo"`: para esa no hay página
 * (`[[...resto]]` responde 404) y el documento usa el idioma de Ajustes, como el resto de la app.
 */
export function generateStaticParams() {
  return IDIOMAS.map((idioma) => ({ idioma }));
}

export async function generateMetadata({ params }: { params: { idioma: string } }): Promise<Metadata> {
  return metadatosBase(esIdioma(params.idioma) ? params.idioma : "es");
}

export default async function LayoutPorIdioma({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { idioma: string };
}) {
  let idioma;
  if (esIdioma(params.idioma)) {
    idioma = params.idioma;
    setRequestLocale(idioma);
  } else {
    idioma = resolverIdioma();
  }
  const mensajes = await mensajesDe(idioma);
  return (
    <Documento idioma={idioma} mensajes={mensajes}>
      {children}
    </Documento>
  );
}
