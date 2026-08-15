/**
 * Gráfica de fondo para las pantallas de portada (ingreso, recuperación de clave).
 *
 * Es un cenital cayendo sobre las verticales de un telón. Va en opacidades muy bajas a
 * propósito: la app se define por restricción, así que esto tiene que leerse como textura
 * al mirar, no como ilustración. Si compite con el formulario, está mal calibrado.
 *
 * Sin `<img>` ni archivo: es SVG inline, así no agrega un request ni un asset que mantener,
 * y hereda el color de la paleta en vez de traer el suyo.
 */
export function FondoTelon() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Cenital: elipse difusa arriba al centro, como la luz que baja a la escena. */}
      <svg
        className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2"
        viewBox="0 0 720 520"
        fill="none"
      >
        <defs>
          <radialGradient id="cenital" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#d81b7a" stopOpacity="0.10" />
            <stop offset="45%" stopColor="#d81b7a" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#d81b7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="360" cy="40" rx="360" ry="260" fill="url(#cenital)" />
      </svg>

      {/* Telón: verticales de ancho irregular, que es lo que da la lectura de tela plegada
          en vez de una grilla. Se desvanecen antes de llegar al formulario. */}
      <svg
        className="absolute inset-x-0 top-0 h-[340px] w-full"
        viewBox="0 0 400 340"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="desvanece" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18161a" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#18161a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[8, 34, 57, 88, 112, 141, 168, 196, 223, 251, 278, 309, 336, 362, 391].map((x, i) => (
          <rect
            key={x}
            x={x}
            y="0"
            width={i % 3 === 0 ? 2.5 : 1.25}
            height="340"
            fill="url(#desvanece)"
          />
        ))}
      </svg>
    </div>
  );
}
