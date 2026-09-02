/**
 * Única definición de la marca. Cualquier lugar que muestre "Yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * El gesto gráfico es un **telón que se abre**: un arco de proscenio con dos cortinados
 * partidos desde el centro. El filete debajo de la palabra dejó de ser una barra recta y
 * ahora es un **festón** —la caída ondulada de la tela—. Ambos van en SVG que hereda el
 * color, así el logo se adapta a fondo claro u oscuro con la prop `tono`.
 */

const TAMANOS = {
  sm: { texto: "text-lg", glifo: "h-4 w-4", festonAlto: 3, espacio: "gap-2" },
  md: { texto: "text-2xl", glifo: "h-6 w-6", festonAlto: 4, espacio: "gap-2.5" },
  lg: { texto: "text-3xl", glifo: "h-8 w-8", festonAlto: 5, espacio: "gap-3" },
} as const;

type Tono = "ink" | "claro";

const TONO: Record<Tono, { texto: string; acento: string }> = {
  ink: { texto: "text-ink-900", acento: "text-brand-500" },
  claro: { texto: "text-white", acento: "text-candileja-400" },
};

function TelonGlifo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* Bambalina / arco superior */}
      <path
        d="M2 4h20v3c-2 .6-3.5 1.4-4 3-.6-1.6-2-2.4-4-3-2 .6-3.4 1.4-4 3-.6-1.6-2-2.4-4-3V4Z"
        fill="currentColor"
      />
      {/* Cortinado izquierdo, recogido */}
      <path
        d="M3 4c.4 4 .2 9-1 13 1.6.8 3.4.8 5 0-1-4-1.2-9-1-13H3Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Cortinado derecho, recogido */}
      <path
        d="M21 4c-.4 4-.2 9 1 13-1.6.8-3.4.8-5 0 1-4 1.2-9 1-13h2Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function Festón({ alto, className = "" }: { alto: number; className?: string }) {
  // Un tramo repetido de arcos: la tela cae en ondas. `preserveAspectRatio="none"` para que
  // se estire al ancho de la palabra sin deformar la altura.
  return (
    <svg
      viewBox="0 0 48 6"
      preserveAspectRatio="none"
      className={className}
      style={{ height: alto }}
      aria-hidden="true"
    >
      <path
        d="M0 0h48v1.5c-4 0-4 3.5-8 3.5S36 1.5 32 1.5 28 5 24 5 20 1.5 16 1.5 12 5 8 5 4 1.5 0 1.5V0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Logotipo({
  tamano = "md",
  tono = "ink",
  className = "",
}: {
  tamano?: keyof typeof TAMANOS;
  tono?: Tono;
  className?: string;
}) {
  const t = TAMANOS[tamano];
  const c = TONO[tono];

  return (
    <span className={`inline-flex items-center ${t.espacio} ${className}`}>
      <TelonGlifo className={`${t.glifo} ${c.acento}`} />
      <span className="flex flex-col gap-1">
        <span
          className={`font-display font-semibold leading-none tracking-[-0.02em] ${t.texto} ${c.texto}`}
        >
          Yalope
        </span>
        <Festón alto={t.festonAlto} className={`w-full ${c.acento}`} />
      </span>
    </span>
  );
}

/**
 * Variante horizontal para barras y encabezados, donde el festón debajo rompe la altura.
 * El telón va chiquito antes de la palabra y el acento cierra como un punto.
 */
export function LogotipoInline({
  tono = "ink",
  className = "",
}: {
  tono?: Tono;
  className?: string;
}) {
  const c = TONO[tono];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TelonGlifo className={`h-4 w-4 ${c.acento}`} />
      <span
        className={`font-display text-lg font-semibold leading-none tracking-[-0.02em] ${c.texto}`}
      >
        Yalope
        <span className={c.acento} aria-hidden="true">
          .
        </span>
      </span>
    </span>
  );
}
