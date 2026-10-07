import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La portada en `/` para quien no tiene sesión la sirve el middleware (`src/middleware.ts`),
  // en el idioma de cada quien (#237): antes era un rewrite fijo acá, solo en castellano.
  images: {
    // Las fotos viven en el bucket público `fotos-perfil` de Supabase Storage y se
    // sirven con `getPublicUrl` → `https://<ref>.supabase.co/storage/v1/object/public/...`.
    // `next/image` necesita el host declarado para optimizarlas (redimensionado + WebP/AVIF
    // vía la Image Optimization del deploy). El `pathname` lo acota a lo ya público.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sin org/project/authToken todavía: no sube source maps (harden pendiente, no bloquea
  // la captura de errores). Sí resuelve el warning de webpack por `require-in-the-middle`
  // (instrumentación automática de Node de @sentry/nextjs).
  silent: !process.env.CI,
});
