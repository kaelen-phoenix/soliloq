import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/**
 * Formulario de perfil. Es la pantalla con más campos de la app, así que el esqueleto
 * arranca por la forma de "etiqueta + campo" repetida, que es lo que la vuelve reconocible.
 */
export default function Cargando() {
  return (
    <PantallaCargando className="flex flex-col gap-6 px-5 py-5">
      <section className="flex flex-col gap-4">
        <Esqueleto className="h-3 w-24" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Esqueleto className="h-3 w-28" />
            <Esqueleto className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Esqueleto className="h-3 w-40" />
        <Esqueleto className="h-24 w-full rounded-xl" />
      </section>

      <Esqueleto className="h-11 w-40 rounded-xl" />
    </PantallaCargando>
  );
}
