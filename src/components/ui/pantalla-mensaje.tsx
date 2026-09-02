import Link from "next/link";
import { Logotipo } from "./logotipo";

/**
 * Pantalla de página completa para los momentos en que la app no puede mostrar lo pedido:
 * un error, una ruta que no existe.
 *
 * Existe porque hasta acá esos momentos caían en la pantalla por defecto de Next.js —
 * fondo blanco, tipografía del sistema, en inglés. Es justo cuando la app tiene que
 * parecer más sólida, y era donde se desarmaba del todo.
 *
 * Lleva el logotipo a propósito: que el error siga siendo Yalope y no una página huérfana.
 */
export function PantallaMensaje({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Logotipo tamano="sm" />

      <h1 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em] text-texto">
        {titulo}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-texto-tenue">{detalle}</p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {accion}
        <Link
          href="/"
          className="text-sm font-medium text-texto-tenue underline underline-offset-4 hover:text-texto"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
