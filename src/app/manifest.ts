import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { NARANJA, TINTA } from "./_marca-icono";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("cuenta.manifest");
  return {
    name: t("nombre"),
    short_name: "Yalope",
    description: t("descripcion"),
    start_url: "/",
    display: "standalone",
    background_color: TINTA,
    theme_color: NARANJA,
    orientation: "portrait",
    // El `?v=` corta el caché: los PNG del manifest salen con `immutable, max-age=1año`
    // y sus rutas son fijas, así que sin esto un reinstalar la PWA sigue trayendo el
    // ícono viejo del caché del navegador. Subir el número cada vez que cambie el logo.
    icons: [
      { src: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
