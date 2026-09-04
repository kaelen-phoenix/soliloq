/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest). No es un componente de la app: lo consume `ImageResponse`, que solo
 * entiende estilos inline y un subconjunto de SVG.
 *
 * El isotipo (la «Y» de dos manos que se abren) sale de `@/lib/marca-isotipo`, que es el
 * trazado vectorial del logo real (`docs/marca/isotipo.svg`). Acá se pinta a dos tintas
 * —naranja el brazo izquierdo, rojo el derecho— sobre negro. El PNG apaisado real no se
 * puede recortar limpio a un cuadrado (el wordmark va pegado), por eso se usa el vector.
 */

import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "@/lib/marca-isotipo";

export const NARANJA = "#e62d03";
export const CREMA = "#fbfaf7";
export const TINTA = "#060606";
const BRAZO_IZQ = "#f2571e";
const BRAZO_DER = "#e62d03";

// El isotipo es más alto que ancho (322×402).
const [, , ISO_W, ISO_H] = ISOTIPO_VIEWBOX.split(" ").map(Number);

/**
 * El isotipo real centrado en el cuadrado del ícono, sobre negro.
 * @param escala  fracción del lado que ocupa el ALTO del isotipo (0.7 normal; ~0.55 para
 *                maskable, que el sistema recorta a círculo/squircle).
 */
export function MarcaIcono({
  lado,
  radio,
  escala = 0.7,
}: {
  lado: number;
  radio: number;
  escala?: number;
}) {
  const h = lado * escala;
  const w = (h * ISO_W) / ISO_H;
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
        width={w}
        height={h}
        viewBox={ISOTIPO_VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {ISOTIPO_TRAZOS.map((t, i) => (
          <path
            key={i}
            d={t.d}
            transform={`translate(${t.x},${t.y})`}
            fill={t.brazo === "izq" ? BRAZO_IZQ : BRAZO_DER}
          />
        ))}
      </svg>
    </div>
  );
}
