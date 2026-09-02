import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/** Armar equipo: una tarjeta de persona por vez y los dos botones de decisión. */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col px-5 py-5">
      <div className="rounded-2xl border border-borde p-5">
        <div className="flex items-center gap-3.5">
          <Esqueleto className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Esqueleto className="h-5 w-1/2" />
            <Esqueleto className="mt-2 h-3 w-1/3" />
          </div>
        </div>
        <Esqueleto className="mt-4 h-4 w-full" />
        <Esqueleto className="mt-2 h-4 w-4/5" />
      </div>
      <div className="mx-auto mt-7 flex items-center gap-5">
        <Esqueleto className="h-14 w-14 rounded-full" />
        <Esqueleto className="h-16 w-16 rounded-full" />
      </div>
    </PantallaCargando>
  );
}
