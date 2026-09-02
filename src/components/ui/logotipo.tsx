/**
 * Única definición de la marca. Cualquier lugar que muestre "Yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * El gesto es una **bambalina**: la cenefa de tela que corona el escenario, un solo trazo
 * de pliegues arriba de la palabra. El acento cierra como un punto, no como una barra.
 * Todo hereda el color según `tono` (fondo claro u oscuro).
 */

const TAMANOS = {
  sm: { texto: "text-lg", bambalina: "h-2 w-14" },
  md: { texto: "text-2xl", bambalina: "h-2.5 w-20" },
  lg: { texto: "text-3xl", bambalina: "h-3 w-28" },
} as const;

type Tono = "ink" | "claro";

const TONO: Record<Tono, { texto: string; acento: string }> = {
  ink: { texto: "text-texto", acento: "text-brand-500" },
  claro: { texto: "text-white", acento: "text-candileja-400" },
};

function Bambalina({ className = "" }: { className?: string }) {
  // Pliegues de cenefa: la tela cae en semicírculos desde una barra fina.
  return (
    <svg
      viewBox="0 0 56 10"
      preserveAspectRatio="none"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0 0h56v2c-3.5 0-3.5 6-7 6s-3.5-6-7-6-3.5 6-7 6-3.5-6-7-6-3.5 6-7 6-3.5-6-7-6-3.5 6-7 6-3.5-6-7-6V0Z" />
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
    <span className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      <Bambalina className={`${t.bambalina} ${c.acento}`} />
      <span
        className={`font-display font-semibold leading-none tracking-[-0.02em] ${t.texto} ${c.texto}`}
      >
        Yalope
        <span className={c.acento} aria-hidden="true">
          .
        </span>
      </span>
    </span>
  );
}

/**
 * Variante horizontal para barras y encabezados: solo la palabra y el punto de acento.
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
    <span
      className={`font-display text-lg font-semibold leading-none tracking-[-0.02em] ${c.texto} ${className}`}
    >
      Yalope
      <span className={c.acento} aria-hidden="true">
        .
      </span>
    </span>
  );
}
