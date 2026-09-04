/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest). No es un componente de la app: lo consume `ImageResponse`, que solo
 * entiende estilos inline y un subconjunto de SVG (nada de degradés en `<defs>`, por eso
 * el isotipo va en dos naranjas planos acá, uno por mano).
 *
 * La marca es una **«Y» de dos manos que se abren** (dos tallos que se despliegan en tres
 * trazos cada uno, como una mano o una espiga), igual que en `docs/marca/logotipo-yalope.svg`.
 * No se puede recortar el PNG apaisado a un cuadrado limpio —el wordmark «yalope» va pegado
 * al isotipo—, así que para los cuadrados se redibuja acá y el PNG real queda para la OG.
 */

export const NARANJA = "#e62d03";
export const CREMA = "#fbfaf7";
export const TINTA = "#060606";
const MANO_IZQ = "#f2571e";
const MANO_DER = "#e62d03";

/**
 * El isotipo redibujado, centrado en el cuadrado sobre negro.
 * @param escala  cuánto del lado ocupa el dibujo (0.82 por defecto; ~0.62 para maskable, que
 *                el sistema recorta a círculo/squircle y hay que dejarlo en la zona segura).
 */
export function MarcaIcono({
  lado,
  radio,
  escala = 0.82,
}: {
  lado: number;
  radio: number;
  escala?: number;
}) {
  const s = lado * escala;
  return (
    <div
      style={{
        width: lado,
        height: lado,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: TINTA,
        borderRadius: radio,
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Mano izquierda: un tallo hasta la base y dos dedos que salen a media altura y
            se abren en abanico hacia arriba-izquierda, como una mano o una espiga. */}
        <g stroke={MANO_IZQ}>
          <path d="M11.4 20.3 C11.35 15 11.3 10.3 10.8 7.2" />
          <path d="M11.05 16.6 C10.55 13 9.6 9 8.2 5.6" />
          <path d="M10.9 17.3 C10.1 13.9 8.5 9.4 6.2 5" />
        </g>
        {/* Mano derecha, espejada. */}
        <g stroke={MANO_DER}>
          <path d="M12.6 20.3 C12.65 15 12.7 10.3 13.2 7.2" />
          <path d="M12.95 16.6 C13.45 13 14.4 9 15.8 5.6" />
          <path d="M13.1 17.3 C13.9 13.9 15.5 9.4 17.8 5" />
        </g>
      </svg>
    </div>
  );
}
