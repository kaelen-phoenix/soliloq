import type { MetadataRoute } from "next";
import { NARANJA, TINTA } from "./_marca-icono";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yalope — Match Teatral",
    short_name: "Yalope",
    description:
      "Conectá talento y creadores de teatro. Postulate a convocatorias y armá elenco con un match rápido y visual.",
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
