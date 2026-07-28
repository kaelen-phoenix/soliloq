import type { RolFeed } from "@/components/feed/tarjeta-rol";

/**
 * Las tres tarjetas que ve una sola vez quien entra como talento, antes de las convocatorias
 * reales. Existen para enseñar el gesto —deslizar, postularse, descartar— cuando el feed
 * todavía puede estar vacío en su zona.
 *
 * **No son filas de la base y no pueden serlo.** Son constantes del front, así que:
 *   - no aparecen en `feed_para_talento` ni le compiten a ninguna convocatoria real;
 *   - postularse o descartarlas no escribe nada (ver `avanzar` en `pila-tarjetas.tsx`), lo
 *     cual es deliberado: una postulación a una obra sin creador quedaría `pendiente` para
 *     siempre, porque la sala se abre cuando alguien aprueba y acá no hay quién apruebe;
 *   - los `rol_id` son slugs, no UUID. Si alguno llegara a viajar a Postgres, la inserción
 *     falla en vez de ensuciar los datos. Es la red de contención, no el mecanismo.
 *
 * Cada una va marcada como ejemplo en la propia tarjeta. Que se note es el punto: el valor
 * de esto es que se entienda cómo funciona la app, y eso se cae si alguien cree que se
 * postuló a un casting que no existe.
 *
 * Son tres obras de dominio público que cualquiera reconoce —Ibsen 1879, Lorca 1933,
 * Shakespeare c. 1595—, elegidas para que la tarjeta se lea sin explicación previa. El
 * "creador" no es una persona inventada a propósito: atribuirle una obra falsa a un nombre
 * que suene real es exactamente lo que no queremos.
 */
export const ROLES_EJEMPLO: RolFeed[] = [
  {
    rol_id: "ejemplo-casa-de-munecas",
    rol_nombre: "Nora Helmer",
    rol_tipo: "actuacion",
    edad_minima: 28,
    edad_maxima: 40,
    rol_descripcion:
      "Protagonista. Atraviesa la obra entera desde la comodidad doméstica hasta la ruptura final. Pide manejo del silencio tanto como del texto.",
    vacantes: 1,
    obra_id: "ejemplo-obra-casa-de-munecas",
    obra_titulo: "Casa de muñecas",
    obra_sinopsis:
      "Henrik Ibsen, 1879. Nora sostiene un matrimonio aparentemente feliz sobre un secreto que ella misma firmó. Cuando sale a la luz, descubre cuánto de su vida era un papel escrito por otros.",
    obra_ubicacion_texto: "Buenos Aires, Argentina",
    creador_id: "ejemplo-creador",
    creador_nombre: "Obra de ejemplo",
    creador_imagen_url: null,
    es_ejemplo: true,
  },
  {
    rol_id: "ejemplo-bodas-de-sangre",
    rol_nombre: "La Novia",
    rol_tipo: "actuacion",
    edad_minima: 22,
    edad_maxima: 35,
    rol_descripcion:
      "Rol central. Se casa con un hombre mientras sigue atada a otro. Requiere cuerpo disponible: la obra pide trabajo físico y coro.",
    vacantes: 1,
    obra_id: "ejemplo-obra-bodas-de-sangre",
    obra_titulo: "Bodas de sangre",
    obra_sinopsis:
      "Federico García Lorca, 1933. Una boda en el campo andaluz se rompe cuando la novia huye con Leonardo, el único personaje de la obra que tiene nombre propio. Tragedia en verso y prosa.",
    obra_ubicacion_texto: "Rosario, Argentina",
    creador_id: "ejemplo-creador",
    creador_nombre: "Obra de ejemplo",
    creador_imagen_url: null,
    es_ejemplo: true,
  },
  {
    rol_id: "ejemplo-romeo-y-julieta",
    rol_nombre: "Diseño de iluminación",
    rol_tipo: "tecnica",
    edad_minima: null,
    edad_maxima: null,
    rol_descripcion:
      "Puesta en sala chica, con pocos artefactos y muchos cambios de clima. Se busca a alguien que haya iluminado teatro de texto.",
    vacantes: 1,
    obra_id: "ejemplo-obra-romeo-y-julieta",
    obra_titulo: "Romeo y Julieta",
    obra_sinopsis:
      "William Shakespeare, c. 1595. Dos jóvenes de familias enfrentadas se enamoran y apuran un plan que termina mal. La versión más contada del amor imposible.",
    obra_ubicacion_texto: "Córdoba, Argentina",
    creador_id: "ejemplo-creador",
    creador_nombre: "Obra de ejemplo",
    creador_imagen_url: null,
    es_ejemplo: true,
  },
];
