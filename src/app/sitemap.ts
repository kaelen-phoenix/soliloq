import type { MetadataRoute } from "next";

const BASE = "https://yalope.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return [
    { url: `${BASE}/`, lastModified: ahora, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/ingresar`, lastModified: ahora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
