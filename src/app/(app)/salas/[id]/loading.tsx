import { Esqueleto, PantallaCargando } from "@/components/ui/esqueleto";

/**
 * Chat: encabezado, burbujas alternadas y el campo de escritura abajo. Las burbujas van con
 * anchos distintos porque una columna de bloques del mismo largo no se lee como conversación.
 */
export default function Cargando() {
  return (
    <PantallaCargando>
      <div className="border-b border-ink-100 px-4 py-2">
        <Esqueleto className="h-3 w-28" />
        <Esqueleto className="mt-2 h-4 w-40" />
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        {[
          { propio: false, ancho: "w-3/5" },
          { propio: true, ancho: "w-2/5" },
          { propio: false, ancho: "w-4/6" },
          { propio: true, ancho: "w-1/3" },
        ].map((b, i) => (
          <div key={i} className={`flex ${b.propio ? "justify-end" : "justify-start"}`}>
            <Esqueleto className={`h-12 rounded-2xl ${b.ancho}`} />
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-ink-100 p-3">
        <Esqueleto className="h-11 flex-1 rounded-full" />
        <Esqueleto className="h-11 w-20 rounded-full" />
      </div>
    </PantallaCargando>
  );
}
