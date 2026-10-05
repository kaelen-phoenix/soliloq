import type { RolFeed } from "@/components/feed/tarjeta-rol";
import { traductorCastellano, type TraductorEtiquetas } from "@/lib/constantes";

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
 *
 * Los textos están en `perfil.etiquetas.ejemplos` (#354): `rolesEjemplo(t)` con el traductor
 * de `perfil.etiquetas` los da en el idioma activo; `ROLES_EJEMPLO` es la versión en castellano.
 */
export function rolesEjemplo(t: TraductorEtiquetas = traductorCastellano): RolFeed[] {
  return [
    {
      rol_id: "ejemplo-casa-de-munecas",
      rol_nombre: t("ejemplos.casaDeMunecas.rol"),
      rol_tipo: "actuacion",
      edad_minima: 28,
      edad_maxima: 40,
      rol_descripcion: t("ejemplos.casaDeMunecas.descripcion"),
      vacantes: 1,
      obra_id: "ejemplo-obra-casa-de-munecas",
      obra_titulo: t("ejemplos.casaDeMunecas.titulo"),
      obra_sinopsis: t("ejemplos.casaDeMunecas.sinopsis"),
      obra_ubicacion_texto: "Buenos Aires, Argentina",
      creador_id: "ejemplo-creador",
      creador_nombre: t("ejemplos.creador"),
      creador_imagen_url: null,
      es_ejemplo: true,
    },
    {
      rol_id: "ejemplo-bodas-de-sangre",
      rol_nombre: t("ejemplos.bodasDeSangre.rol"),
      rol_tipo: "actuacion",
      edad_minima: 22,
      edad_maxima: 35,
      rol_descripcion: t("ejemplos.bodasDeSangre.descripcion"),
      vacantes: 1,
      obra_id: "ejemplo-obra-bodas-de-sangre",
      obra_titulo: t("ejemplos.bodasDeSangre.titulo"),
      obra_sinopsis: t("ejemplos.bodasDeSangre.sinopsis"),
      obra_ubicacion_texto: "Rosario, Argentina",
      creador_id: "ejemplo-creador",
      creador_nombre: t("ejemplos.creador"),
      creador_imagen_url: null,
      es_ejemplo: true,
    },
    {
      rol_id: "ejemplo-romeo-y-julieta",
      rol_nombre: t("ejemplos.romeoYJulieta.rol"),
      rol_tipo: "tecnica",
      edad_minima: null,
      edad_maxima: null,
      rol_descripcion: t("ejemplos.romeoYJulieta.descripcion"),
      vacantes: 1,
      obra_id: "ejemplo-obra-romeo-y-julieta",
      obra_titulo: t("ejemplos.romeoYJulieta.titulo"),
      obra_sinopsis: t("ejemplos.romeoYJulieta.sinopsis"),
      obra_ubicacion_texto: "Córdoba, Argentina",
      creador_id: "ejemplo-creador",
      creador_nombre: t("ejemplos.creador"),
      creador_imagen_url: null,
      es_ejemplo: true,
    },
  ];
}

export const ROLES_EJEMPLO: RolFeed[] = rolesEjemplo();
