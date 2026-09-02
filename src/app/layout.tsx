import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

// Se auto-hospeda en el build: sin request a un dominio externo en runtime.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Solo para la marca y los títulos de portada. Fraunces es una serif de display con
// contraste alto: es lo que le da el aire de marquesina y programa de mano que Inter,
// pensada para interfaz, no puede dar.
//
// Va como fuente variable (sin `weight`) y sin ejes extra: declarar un peso fijo la
// convierte en estática, y ahí `axes` deja de ser válido. Los ejes decorativos de Fraunces
// (SOFT, WONK) suman bytes que no se justifican para el puñado de lugares donde aparece.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  style: ["normal"],
});

const DESCRIPCION =
  "Conectá talento y creadores de teatro. Postulate a convocatorias y armá elenco con un match rápido y visual.";

export const metadata: Metadata = {
  // Ancla las URLs relativas de `openGraph`: sin esto, la imagen para compartir se emite
  // como ruta relativa y ninguna plataforma la resuelve.
  metadataBase: new URL("https://yalope.com"),
  title: "Yalope — Match Teatral",
  description: DESCRIPCION,
  // El `<link rel="manifest">` lo inyecta Next desde `app/manifest.ts`.
  // La imagen para compartir la genera `app/opengraph-image.tsx` (y Next la usa también
  // para Twitter), así que no se declara acá.
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Yalope",
    title: "Yalope — Match Teatral",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Yalope — Match Teatral",
    description: DESCRIPCION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yalope",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18161a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Fija `data-tema` antes del primer paint según la cookie, para que el override manual
// (Ajustes) no muestre un flash del tema del sistema. Sin cookie o con 'sistema', no pone
// el atributo y manda `prefers-color-scheme`.
const SCRIPT_TEMA = `(function(){try{var m=document.cookie.match(/(?:^|; )tema=([^;]+)/);var t=m&&m[1];if(t==='oscuro')document.documentElement.dataset.tema='dark';else if(t==='claro')document.documentElement.dataset.tema='light';}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
