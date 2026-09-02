/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest y la imagen OG). No es un componente de la app: lo consume `ImageResponse`,
 * que solo entiende estilos inline y un subconjunto de SVG. Es el arco de proscenio en
 * blanco sobre el frambuesa de la marca.
 */

export const FRAMBUESA = "#cf1f57";
export const CREMA = "#fbfaf7";

export function MarcaIcono({ lado, radio }: { lado: number; radio: number }) {
  const s = lado * 0.6;
  return (
    <div
      style={{
        width: lado,
        height: lado,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: FRAMBUESA,
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
        <path d="M3.5 21V10.5C3.5 6 7.5 2.5 12 2.5S20.5 6 20.5 10.5V21" />
        <path d="M2 21h20" />
        <circle cx="12" cy="15.3" r="2" fill="#ffffff" stroke="none" />
      </svg>
    </div>
  );
}
