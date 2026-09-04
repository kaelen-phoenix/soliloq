import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "@/lib/marca-isotipo";

/**
 * Única definición de la marca. Cualquier lugar que muestre "yalope" tiene que usar esto,
 * para que no existan dos versiones del logo que se desincronicen.
 *
 * La marca es una **«Y» de dos manos que se abren**. El isotipo sale de
 * `@/lib/marca-isotipo` —el trazado vectorial del logo real (`docs/marca/isotipo.svg`)—,
 * acá a una sola tinta que hereda el color según `tono`. El wordmark va en minúscula, en
 * la sans redondeada `marca` (ver `docs/marca/`).
 */

// El isotipo es más alto que ancho (~0.8), así que el ancho del recuadro acompaña.
const TAMANOS = {
  sm: { marca: "h-5 w-4", texto: "text-lg", gap: "gap-1.5" },
  md: { marca: "h-7 w-[1.4rem]", texto: "text-2xl", gap: "gap-2" },
  lg: { marca: "h-10 w-8", texto: "text-[2rem]", gap: "gap-2.5" },
} as const;

type Tono = "ink" | "claro" | "acento";

// El isotipo va siempre en el rojo de marca (salvo sobre superficie oscura, donde va en
// blanco). El wordmark va en tinta, para que la marca no grite en cada barra lateral.
const TONO: Record<Tono, { texto: string; marca: string }> = {
  ink: { texto: "text-texto", marca: "text-brand-500" },
  claro: { texto: "text-white", marca: "text-white" },
  acento: { texto: "text-brand-600", marca: "text-brand-500" },
};

export function MarcaYalope({ className = "h-6 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox={ISOTIPO_VIEWBOX}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {ISOTIPO_TRAZOS.map((t, i) => (
        <path key={i} d={t.d} transform={`translate(${t.x},${t.y})`} />
      ))}
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
