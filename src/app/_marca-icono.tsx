/**
 * El dibujo de la marca para los íconos generados (`icon.tsx`, `apple-icon.tsx`, los PNG
 * del manifest y la imagen OG). No es un componente de la app: lo consume `ImageResponse`,
 * que solo entiende estilos inline y un subconjunto de CSS. Es un mini escenario —cenefa
 * de pliegues y dos cortinados— en blanco sobre el frambuesa de la marca.
 */

export const FRAMBUESA = "#cf1f57";
export const CREMA = "#faf5ec";

export function MarcaIcono({ lado, radio }: { lado: number; radio: number }) {
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
        width={lado * 0.62}
        height={lado * 0.62}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cenefa (bambalina) */}
        <path
          d="M2 4h44v6c-4 0-4 7-8 7s-4-7-8-7-4 7-8 7-4-7-8-7-4 7-8 7-4-7-8-7V4Z"
          fill="#ffffff"
        />
        {/* Cortinado izquierdo */}
        <path d="M4 6c1 12 .6 24-2 34 3 1.6 7 1.6 10 0-1.8-10-2.2-22-1-34H4Z" fill="#ffffff" />
        {/* Cortinado derecho */}
        <path
          d="M44 6c-1 12-.6 24 2 34-3 1.6-7 1.6-10 0 1.8-10 2.2-22 1-34h7Z"
          fill="#ffffff"
        />
        {/* Foco de escena */}
        <circle cx="24" cy="30" r="5" fill={CREMA} />
      </svg>
    </div>
  );
}
