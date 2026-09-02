import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/** Listado de avisos: ícono a la izquierda, texto y fecha a la derecha. */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col gap-2 px-5 py-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-borde p-4">
          <Esqueleto className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Esqueleto className="h-4 w-3/4" />
            <Esqueleto className="mt-2 h-3 w-20" />
          </div>
        </div>
      ))}
    </PantallaCargando>
  );
}
