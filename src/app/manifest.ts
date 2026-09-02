import type { MetadataRoute } from "next";
import { CREMA, FRAMBUESA } from "./_marca-icono";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yalope — Match Teatral",
    short_name: "Yalope",
    description:
      "Conectá talento y creadores de teatro. Postulate a convocatorias y armá elenco con un match rápido y visual.",
    start_url: "/",
    display: "standalone",
    background_color: CREMA,
    theme_color: FRAMBUESA,
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
