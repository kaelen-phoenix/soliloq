/**
 * Bloque gris que ocupa el lugar de un contenido que todavía no llegó.
 *
 * La razón de que existan los esqueletos: sin un `loading.tsx`, el App Router **bloquea** la
 * navegación hasta que el server component termina. Como todas las rutas de `(app)` son
 * dinámicas y el layout resuelve sesión y estado de cuenta en cada una, entre el toque y el
 * cambio de pantalla pasaban cientos de milisegundos en los que no se veía absolutamente
 * nada. Un `loading.tsx` convierte esa espera en un cambio de pantalla instantáneo.
 *
 * Cada esqueleto imita la forma de la pantalla que va a aparecer, no una forma genérica: la
 * idea es que el salto al contenido real se sienta como que se rellenó algo, no como que se
 * reemplazó una pantalla por otra.
 *
 * `motion-safe` respeta a quien pidió menos animación en el sistema; para esa persona el
 * bloque queda gris y quieto, que cumple igual.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`motion-safe:animate-pulse rounded-lg bg-ink-100 ${className}`} />;
}

/** Contenedor con el rótulo accesible: sin esto un lector de pantalla anuncia sólo silencio. */
export function PantallaCargando({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className={className}>
      {children}
    </div>
  );
}
