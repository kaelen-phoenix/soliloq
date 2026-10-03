import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/**
 * Fallback de `/proyectos` (#288): mientras llega el tablero de Proyectos y Equipos propios.
 * Forma neutra —una franja de controles y un bloque grande— porque según el caso aparece el
 * formulario para armar el primero, el listado o el panel del equipo.
 */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col px-5 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Esqueleto className="h-6 w-24" />
        <Esqueleto className="h-6 w-16" />
      </div>
      <Esqueleto className="mx-auto h-[500px] w-full max-w-sm rounded-2xl" />
      <div className="mx-auto mt-7 flex items-center gap-5">
        <Esqueleto className="h-14 w-14 rounded-full" />
        <Esqueleto className="h-16 w-16 rounded-full" />
      </div>
    </PantallaCargando>
  );
}
