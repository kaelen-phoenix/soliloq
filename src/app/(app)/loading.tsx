import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/**
 * Fallback del segmento `(app)`: cubre la home —el feed del talento o el tablero del
 * creador— y cualquier ruta anidada que no traiga su propio `loading.tsx`.
 *
 * Por eso la forma es deliberadamente neutra: una franja de controles y un bloque grande.
 * Sirve tanto para la pila de tarjetas como para un listado sin mentirle a ninguno de los
 * dos. Las pantallas de más tránsito tienen el suyo, más parecido a lo que va a aparecer.
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
