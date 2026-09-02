/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
