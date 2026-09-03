/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest). No es un componente de la app: lo consume `ImageResponse`, que solo
 * entiende estilos inline y un subconjunto de SVG (nada de degradés en `<defs>`, por eso
 * el isotipo va en un naranja-rojo plano acá).
 *
 * La marca es una **«Y» de dos manos que se abren**, como en `docs/marca/logotipo-yalope.svg`.
 */

export const NARANJA = "#e62d03";
export const CREMA = "#fbfaf7";
export const TINTA = "#060606";
const MARCA_ICONO = "#f2571e";

export function MarcaIcono({ lado, radio }: { lado: number; radio: number }) {
  const s = lado * 0.82;
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
        stroke={MARCA_ICONO}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tallo. */}
        <path d="M12 21.5V13" />
        {/* Brazo izquierdo: trazo largo + uno corto por dentro, como una mano abierta. */}
        <path d="M12 13C10.6 10 8.5 6.9 5.5 4.2" />
        <path d="M12 13C11.2 10.9 10.2 9.1 8.7 7.6" />
        {/* Brazo derecho, espejado. */}
        <path d="M12 13C13.4 10 15.5 6.9 18.5 4.2" />
        <path d="M12 13C12.8 10.9 13.8 9.1 15.3 7.6" />
      </svg>
    </div>
  );
}
