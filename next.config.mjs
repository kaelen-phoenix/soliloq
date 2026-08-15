/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // El dominio viejo sigue resolviendo y sirviendo la app: Vercel no lo apaga al
      // agregar uno propio. Sin esto la marca vieja queda viva y el SEO partido en dos.
      // Matchea el alias exacto de producción, no `.vercel.app` en general, para no
      // romper los deploys de preview.
      {
        source: "/:ruta*",
        has: [{ type: "host", value: "soliloq-one.vercel.app" }],
        destination: "https://yalope.com/:ruta*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
