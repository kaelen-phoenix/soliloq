/**
 * Única definición de la marca. Cualquier lugar que muestre "Yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * La marca es un **arco de proscenio**: el marco del escenario visto de frente, con la
 * tabla del piso y una figura bajo la luz. Geométrico y de una sola tinta, así se lee
 * igual en un favicon de 16px que en una portada. La palabra va en la serif de display
 * (registro de programa de mano). Todo hereda el color según `tono`.
 */

const TAMANOS = {
  sm: { marca: "h-5 w-5", texto: "text-lg", gap: "gap-1.5" },
  md: { marca: "h-7 w-7", texto: "text-2xl", gap: "gap-2" },
  lg: { marca: "h-10 w-10", texto: "text-[2rem]", gap: "gap-2.5" },
} as const;

type Tono = "ink" | "claro" | "acento";

const TONO: Record<Tono, { texto: string; marca: string }> = {
  ink: { texto: "text-texto", marca: "text-texto" },
  claro: { texto: "text-white", marca: "text-white" },
  acento: { texto: "text-texto", marca: "text-brand-500" },
};

export function MarcaProscenio({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Arco de proscenio, abierto abajo. */}
      <path d="M3.5 21V10.5C3.5 6 7.5 2.5 12 2.5S20.5 6 20.5 10.5V21" />
      {/* Tabla del escenario. */}
      <path d="M2 21h20" />
      {/* Figura bajo la luz. */}
      <circle cx="12" cy="15.5" r="1.9" fill="currentColor" stroke="none" />
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
    <span className={`inline-flex items-center ${t.gap} ${className}`}>
      <MarcaProscenio className={`${t.marca} ${c.marca}`} />
      <span
        className={`font-display font-semibold leading-none tracking-[-0.02em] ${t.texto} ${c.texto}`}
      >
        Yalope
      </span>
    </span>
  );
}

/** Igual que `Logotipo` pero siempre en el tamaño chico, para barras y encabezados. */
export function LogotipoInline({
  tono = "ink",
  className = "",
}: {
  tono?: Tono;
  className?: string;
}) {
  return <Logotipo tamano="sm" tono={tono} className={className} />;
}
