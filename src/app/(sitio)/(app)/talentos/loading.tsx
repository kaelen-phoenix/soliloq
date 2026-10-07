import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/** Buscador de talento: panel de filtros arriba, grilla de fotos abajo. */
export default function Cargando() {
  return (
    <PantallaCargando className="px-5 py-5">
      <Esqueleto className="h-6 w-40" />
      <Esqueleto className="mb-5 mt-2 h-4 w-64" />
      <Esqueleto className="h-56 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Esqueleto className="aspect-[3/4] rounded-2xl" />
            <Esqueleto className="h-3.5 w-2/3" />
            <Esqueleto className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </PantallaCargando>
  );
}
