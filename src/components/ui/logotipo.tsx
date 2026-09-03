/**
 * Única definición de la marca. Cualquier lugar que muestre "yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * La marca es una **«Y» abierta hacia arriba**: dos brazos que se abren, como manos que
 * reciben o un brote. Geométrica y de una sola tinta, así se lee igual en un favicon de
 * 16px que en una portada. El wordmark va en minúscula, en la sans redondeada `marca`
 * (ver `docs/marca/`). Todo hereda el color según `tono`.
 */

const TAMANOS = {
  sm: { marca: "h-5 w-5", texto: "text-lg", gap: "gap-1.5" },
  md: { marca: "h-7 w-7", texto: "text-2xl", gap: "gap-2" },
  lg: { marca: "h-10 w-10", texto: "text-[2rem]", gap: "gap-2.5" },
} as const;

type Tono = "ink" | "claro" | "acento";

// El isotipo va siempre en el rojo de marca (salvo sobre superficie oscura, donde va en
// blanco). El wordmark va en tinta, para que la marca no grite en cada barra lateral.
const TONO: Record<Tono, { texto: string; marca: string }> = {
  ink: { texto: "text-texto", marca: "text-brand-500" },
  claro: { texto: "text-white", marca: "text-white" },
  acento: { texto: "text-brand-600", marca: "text-brand-500" },
};

export function MarcaYalope({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
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
      <MarcaYalope className={`${t.marca} ${c.marca}`} />
      <span
        className={`font-marca font-extrabold lowercase leading-none tracking-[-0.03em] ${t.texto} ${c.texto}`}
      >
        yalope
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
