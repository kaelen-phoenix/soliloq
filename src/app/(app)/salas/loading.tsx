import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/** Imita las tarjetas de sala: título arriba, último mensaje abajo, chevron a la derecha. */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col gap-2 px-5 py-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-borde p-4">
          <div className="min-w-0 flex-1">
            <Esqueleto className="h-4 w-2/5" />
            <Esqueleto className="mt-2 h-3 w-3/4" />
          </div>
          <Esqueleto className="h-4 w-4 shrink-0" />
        </div>
      ))}
    </PantallaCargando>
  );
}
