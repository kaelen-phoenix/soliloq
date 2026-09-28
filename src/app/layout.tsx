import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { SplashMarca } from "@/components/ui/splash-marca";

// Se auto-hospeda en el build: sin request a un dominio externo en runtime.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Solo para el wordmark de la marca: «yalope» en minúscula, en la sans redondeada y pesada
// del logotipo (ver `docs/marca/logotipo-yalope.svg`). Baloo 2 es la que más se acerca a
// esas terminaciones redondas. No es una fuente de interfaz ni de títulos — esos van en
// Inter (desde #217 los títulos también: la referencia usa una sans pesada, no una serif). Un solo peso: el wordmark siempre va en 800.
const baloo = Baloo_2({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-marca",
  weight: ["800"],
});

const DESCRIPCION =
  "Yalope conecta actores, actrices y creadores con un match rápido y visual: cuando el interés es mutuo, se abre el chat. Armá tu equipo y compartí tu perfil como booking.";

export const metadata: Metadata = {
  // Ancla las URLs relativas de `openGraph`: sin esto, la imagen para compartir se emite
  // como ruta relativa y ninguna plataforma la resuelve.
  metadataBase: new URL("https://yalope.com"),
  title: "Yalope — El match de actores y actrices",
  description: DESCRIPCION,
  // El `<link rel="manifest">` lo inyecta Next desde `app/manifest.ts`.
  // La imagen para compartir la genera `app/opengraph-image.tsx` (y Next la usa también
  // para Twitter), así que no se declara acá.
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Yalope",
    title: "Yalope — El match de actores y actrices",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Yalope — El match de actores y actrices",
    description: DESCRIPCION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yalope",
  },
};

export const viewport: Viewport = {
  // Sin `themeColor` acá: el meta lo maneja `SCRIPT_TEMA` según el tema que quedó (#217).
  // Si lo declara Next, al hidratar vuelve a insertar el suyo y quedan dos.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Al abrirse el teclado en el teléfono, la ventana de layout se achica en lugar de que
  // el teclado tape el contenido. Es lo que hace que en el chat (`salas/[id]`) el cuadro
  // de texto quede pegado arriba del teclado y no "salte" dejando un hueco: el `100dvh`
  // del contenedor y la barra inferior fija se reacomodan solos.
  interactiveWidget: "resizes-content",
};

// Fija `data-tema` antes del primer paint según la cookie de Ajustes, para que no haya un
// flash del tema equivocado. #217: sin elección guardada la app es **oscura** (el `<html>`
// ya sale con `data-tema="dark"`); "Claro" pasa a claro, y "Sistema" —solo si alguien lo
// eligió a propósito— sigue al teléfono, también si cambia con la app abierta.
//
// Deja `window.__tema(t)` para que Ajustes aplique un cambio al toque con la misma regla,
// y es el único dueño del meta `theme-color` (la barra del navegador): lo crea y lo acomoda
// al tema que quedó, para que en claro no quede una franja negra arriba.
const SCRIPT_TEMA = `(function(){var d=document.documentElement,mq=window.matchMedia('(prefers-color-scheme: light)'),actual=null;function aplicar(t){var claro=t==='claro'||(t==='sistema'&&mq.matches);d.dataset.tema=claro?'light':'dark';var m=document.getElementById('tema-color');if(!m){m=document.createElement('meta');m.id='tema-color';m.name='theme-color';document.head.appendChild(m);}m.content=claro?'#ffffff':'#0c0a0b';}window.__tema=function(t){actual=t;aplicar(t);};var alCambiar=function(){if(actual==='sistema')aplicar(actual);};if(mq.addEventListener)mq.addEventListener('change',alCambiar);else if(mq.addListener)mq.addListener(alCambiar);try{var c=document.cookie.match(/(?:^|; )tema=([^;]+)/);window.__tema(c&&c[1]);}catch(e){d.dataset.tema='dark';}})();`;

// Splash de apertura (#245): se muestra una vez por pestaña. Antes del primer pintado, lo
// omite si ya se vio en esta sesión o si el navegador está automatizado (los e2e no tienen
// por qué esperarlo); si `sessionStorage` no está disponible, también (mejor sin splash que
// con uno en cada navegación). "Reducir movimiento" lo resuelve el CSS.
const SCRIPT_SPLASH = `(function(){var d=document.documentElement;try{if(navigator.webdriver||sessionStorage.getItem('splash')){d.dataset.splash='omitir';}else{sessionStorage.setItem('splash','1');}}catch(e){d.dataset.splash='omitir';}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-tema="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${baloo.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SPLASH }} />
      </head>
      <body className="min-h-screen">
        <SplashMarca />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
