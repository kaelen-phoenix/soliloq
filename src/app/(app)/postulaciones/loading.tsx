import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/** Listado de postulaciones: rol y obra a la izquierda, chip de estado a la derecha. */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col gap-2 px-5 py-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-borde p-4">
          <div className="min-w-0 flex-1">
            <Esqueleto className="h-4 w-1/2" />
            <Esqueleto className="mt-2 h-3 w-2/3" />
          </div>
          <Esqueleto className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </PantallaCargando>
  );
}
