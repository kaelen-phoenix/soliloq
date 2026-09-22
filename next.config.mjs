import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

// Cookie de sesión de Supabase (`sb-<ref>-auth-token`, más los chunks `.0`/`.1` cuando el
// token es largo). Si NINGUNA está, quien pide `/` es anónimo y se le sirve la landing sin
// redirect: `yalope.com/` responde 200 con contenido indexable en vez de un 307.
//
// El `<ref>` sale de `NEXT_PUBLIC_SUPABASE_URL` en vez de ir hardcodeado: hardcodeado al de
// prod, corriendo contra cualquier otro proyecto (staging, otro Supabase local) la cookie
// real nunca coincide, la condición "falta la cookie" da siempre verdadero, y `/` termina
// sirviendo la landing SIEMPRE, con sesión o sin ella (encontrado armando el E2E de
// staging para #122 — silencioso, porque nada asegura contra una sesión real ahí).
const REF_SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(
  /^https:\/\/([^.]+)\.supabase\.co/
)?.[1];
const COOKIE_SESION = REF_SUPABASE
  ? `sb-${REF_SUPABASE}-auth-token`
  : "sb-ydnafjmznntfmzrsijko-auth-token";

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

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sin org/project/authToken todavía: no sube source maps (harden pendiente, no bloquea
  // la captura de errores). Sí resuelve el warning de webpack por `require-in-the-middle`
  // (instrumentación automática de Node de @sentry/nextjs).
  silent: !process.env.CI,
});
