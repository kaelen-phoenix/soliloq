import { FondoTelon } from "@/components/ui/fondo-telon";
import { Logotipo } from "@/components/ui/logotipo";

const ARGUMENTOS = [
  {
    titulo: "Postulate a convocatorias",
    detalle: "Roles reales de obras que se están armando cerca tuyo.",
  },
  {
    titulo: "Armá equipo sin proyecto",
    detalle: "Conocé gente con ganas de crear, incluso antes de tener la idea.",
  },
  {
    titulo: "Coordiná en un solo lugar",
    detalle: "Cuando hay equipo se abre una sala con todo el elenco.",
  },
];

/**
 * Marco de las pantallas públicas: ingreso, recuperación y cambio de clave.
 *
 * En un teléfono es una columna centrada — la app. En una computadora se parte en dos: un
 * panel de marca a la izquierda y el formulario a la derecha. El motivo no es adorno: una
 * columna angosta sobre una pantalla de 1900px se lee como una app de celular estirada, y
 * el login es lo primero que ve alguien a quien le pasaron el link por mail.
 *
 * El panel oscuro es la misma idea que la tarjeta del feed —la caja negra teatral— así que
 * la marca se sostiene sola sin inventar un segundo lenguaje visual para escritorio.
 */
export function MarcoAcceso({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_minmax(28rem,34rem)]">
      {/* Panel de marca. En móvil desaparece por completo: ahí el logotipo lo pone la
          columna del formulario, y tres argumentos de venta arriba del teclado sobran. */}
      <aside className="relative hidden overflow-hidden bg-ink-950 px-14 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <FondoTelon variante="oscuro" />

        <div className="relative">
          <span className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
            Yalope
          </span>
          <span className="mt-2 block h-[3px] w-8 rounded-full bg-brand-500" aria-hidden="true" />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.02em]">
            El teatro se hace de a muchos.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/60">
            Yalope conecta a quien tiene una idea con quien quiere hacerla.
          </p>

          <ul className="mt-9 flex flex-col gap-5">
            {ARGUMENTOS.map((a) => (
              <li key={a.titulo} className="flex gap-3.5">
                <span
                  className="mt-[0.4rem] h-[3px] w-5 shrink-0 rounded-full bg-brand-500"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-base font-medium">{a.titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/50">{a.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs text-white/30">Match teatral · Argentina</p>
      </aside>

      {/* Columna del formulario. En móvil ocupa todo y trae el telón claro de fondo; en
          escritorio va limpia, porque la textura ya la pone el panel de al lado. */}
      <main className="relative flex min-h-screen flex-col justify-center px-6 py-12 lg:px-14">
        <div className="lg:hidden">
          <FondoTelon />
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logotipo tamano="lg" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
