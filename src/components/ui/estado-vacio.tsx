import { Icono } from "./icono";

/**
 * Pantalla sin contenido. Estaba repetida inline en cinco lugares con variaciones mínimas,
 * que es como los estados vacíos terminan divergiendo entre sí.
 *
 * El ícono va dentro de un disco con el filete magenta al pie: un estado vacío no es un
 * error, y sin ese gesto la pantalla se lee como algo que falló. La ilustración es
 * deliberadamente chica — el peso lo tiene que llevar el texto, que es lo que explica qué
 * hacer a continuación.
 */
export function EstadoVacio({
  icono,
  titulo,
  detalle,
  accion,
}: {
  icono: React.ComponentProps<typeof Icono>["nombre"];
  titulo: string;
  detalle: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-borde px-8 py-12 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-fondo-sutil">
        <Icono nombre={icono} className="h-6 w-6 text-texto-tenue" />
        <span
          className="absolute -bottom-1 h-[2.5px] w-5 rounded-full bg-brand-500/70"
          aria-hidden="true"
        />
      </span>

      <p className="mt-5 text-base font-medium text-texto">{titulo}</p>
      <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-texto-tenue">{detalle}</p>

      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
