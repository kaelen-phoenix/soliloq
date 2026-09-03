/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest y las imágenes OG). No es un componente de la app: lo consume `ImageResponse`,
 * que solo entiende estilos inline y un subconjunto de SVG.
 *
 * La marca es una **«Y» abierta hacia arriba** —dos brazos que se abren, como manos que
 * reciben o un brote— en blanco sobre el rojo-naranja de Yalope. Ver `docs/marca/`.
 */

export const NARANJA = "#e62d03";
export const CREMA = "#fbfaf7";

export function MarcaIcono({ lado, radio }: { lado: number; radio: number }) {
  const s = lado * 0.62;
  return (
    <div
      style={{
        width: lado,
        height: lado,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: NARANJA,
        borderRadius: radio,
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tallo. */}
        <path d="M12 21V13" />
        {/* Brazo izquierdo: trazo largo + uno corto por dentro, como una mano abierta. */}
        <path d="M12 13C10.3 10 8.2 7.4 5.5 5.4" />
        <path d="M12 13C11 11 9.9 9.3 8.7 8" />
        {/* Brazo derecho, espejado. */}
        <path d="M12 13C13.7 10 15.8 7.4 18.5 5.4" />
        <path d="M12 13C13 11 14.1 9.3 15.3 8" />
      </svg>
    </div>
  );
}
