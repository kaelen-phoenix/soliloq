import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soliloq — Match Teatral",
  description:
    "Conectá talento y creadores de teatro. Postulate a convocatorias y armá elenco con un match rápido y visual.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Soliloq",
  },
};

export const viewport: Viewport = {
  themeColor: "#d31f74",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
