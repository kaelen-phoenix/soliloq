import createNextIntlPlugin from "next-intl/plugin";

// Cookie de sesión de Supabase (`sb-<ref>-auth-token`, más los chunks `.0`/`.1` cuando el
// token es largo). Si NINGUNA está, quien pide `/` es anónimo y se le sirve la landing sin
// redirect: `yalope.com/` responde 200 con contenido indexable en vez de un 307.
const COOKIE_SESION = "sb-ydnafjmznntfmzrsijko-auth-token";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          missing: [
            { type: "cookie", key: COOKIE_SESION },
            { type: "cookie", key: `${COOKIE_SESION}.0` },
          ],
          destination: "/bienvenida",
        },
      ],
    };
  },
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

export default withNextIntl(nextConfig);
