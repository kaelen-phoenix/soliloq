import type { MetadataRoute } from "next";

const BASE = "https://yalope.com";

type Entrada = { ruta: string; en: string; frecuencia: "monthly" | "yearly"; prioridad: number };

// #237: cada página pública en castellano (sin prefijo) y en inglés (`/en/…`), con las dos
// versiones declaradas como alternativas del mismo contenido.
const PUBLICAS: Entrada[] = [
  { ruta: "/", en: "/en/bienvenida", frecuencia: "monthly", prioridad: 1 },
  { ruta: "/apoyar", en: "/en/apoyar", frecuencia: "monthly", prioridad: 0.6 },
  { ruta: "/normas", en: "/en/normas", frecuencia: "yearly", prioridad: 0.3 },
  { ruta: "/privacidad", en: "/en/privacidad", frecuencia: "yearly", prioridad: 0.3 },
  { ruta: "/terminos", en: "/en/terminos", frecuencia: "yearly", prioridad: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  const conIdiomas = PUBLICAS.flatMap(({ ruta, en, frecuencia, prioridad }) => {
    const alternates = { languages: { es: `${BASE}${ruta}`, en: `${BASE}${en}` } };
    return [
      { url: `${BASE}${ruta}`, lastModified: ahora, changeFrequency: frecuencia, priority: prioridad, alternates },
      { url: `${BASE}${en}`, lastModified: ahora, changeFrequency: frecuencia, priority: prioridad, alternates },
    ];
  });
  return [
    ...conIdiomas,
    { url: `${BASE}/ingresar`, lastModified: ahora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
