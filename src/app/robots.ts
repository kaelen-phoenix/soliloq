import type { MetadataRoute } from "next";

const BASE = "https://yalope.com";

/**
 * Lo único indexable es la superficie pública: la landing y el login. El resto —el área
 * de la app y los enlaces de perfil (`/p/…`, que además son de token privado)— queda fuera.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/bienvenida", "/ingresar"],
      disallow: [
        "/p/",
        "/salas",
        "/perfil",
        "/notificaciones",
        "/talentos",
        "/creadores",
        "/obras",
        "/equipo",
        "/postulaciones",
        "/completar-perfil",
        "/elegir-rol",
        "/cambiar-clave",
        "/recuperar",
        "/auth/",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
