/**
 * Máscaras de comedia y tragedia, el emblema del teatro. SVG inline, sin archivo ni
 * request; hereda `currentColor`, así que el color lo pone quien la usa (normalmente
 * `text-telon-*` o `text-candileja-*` sobre una superficie de portada).
 *
 * Decorativa: `aria-hidden`. Nunca lleva información que no esté también en texto.
 */
export function MascarasTeatro({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Comedia: sonríe. */}
      <path d="M4 5c6-2 12-2 18 0 1 8-1 17-6 22-2 2-4 3-6 3s-4-1-6-3C-1 22-2 13 4 5Z" />
      <path d="M8 14c1.4-1.4 3.6-1.4 5 0M9 24c2 2.2 5 2.2 7 0" />
      {/* Tragedia: llora, un paso atrás. */}
      <path d="M26 9c6-2 12-2 18 0 1 8-1 17-6 22-2 2-4 3-6 3s-4-1-6-3c-5-5-7-14-6-22Z" />
      <path d="M30 18c1.4-1.4 3.6-1.4 5 0M31 28c2-2 5-2 7 0M33.5 33.5v3" />
    </svg>
  );
}
