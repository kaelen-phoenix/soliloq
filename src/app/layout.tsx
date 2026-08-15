import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
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
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Yalope",
    title: "Yalope — Match Teatral",
    description: DESCRIPCION,
    // La imagen es solo la marca: el nombre y la descripción los muestra la plataforma al
    // lado, así que repetirlos adentro sería redundante.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Yalope" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yalope — Match Teatral",
    description: DESCRIPCION,
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yalope",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
