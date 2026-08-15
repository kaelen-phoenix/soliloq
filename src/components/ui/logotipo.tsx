/**
 * Única definición de la marca. Cualquier lugar que muestre "Yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * El filete magenta debajo de la palabra es la cita al telón y, a la vez, el único adorno
 * que se permite: el acento sigue reservado a la acción de postularse y a los contadores,
 * así que acá aparece como una línea de 24px y no como un fondo o un relleno.
 */

const TAMANOS = {
  sm: { texto: "text-lg", filete: "h-[2px] w-4", espacio: "gap-1.5" },
  md: { texto: "text-2xl", filete: "h-[2.5px] w-6", espacio: "gap-2" },
  lg: { texto: "text-3xl", filete: "h-[3px] w-9", espacio: "gap-2.5" },
} as const;

export function Logotipo({
  tamano = "md",
  className = "",
}: {
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const t = TAMANOS[tamano];

  return (
    <span className={`flex flex-col ${t.espacio} ${className}`}>
      {/* `leading-none` porque la serif trae mucho interlineado propio y desalinea el filete. */}
      <span
        className={`font-display font-semibold leading-none tracking-[-0.02em] text-ink-900 ${t.texto}`}
      >
        Yalope
      </span>
      <span className={`rounded-full bg-brand-500 ${t.filete}`} aria-hidden="true" />
    </span>
  );
}

/**
 * Variante horizontal para barras y encabezados, donde el filete debajo rompe la altura.
 * Acá el acento va como un punto al final de la palabra, como el punto de un logotipo.
 */
export function LogotipoInline({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-lg font-semibold leading-none tracking-[-0.02em] text-ink-900 ${className}`}
    >
      Yalope
      <span className="text-brand-500" aria-hidden="true">
        .
      </span>
    </span>
  );
}
