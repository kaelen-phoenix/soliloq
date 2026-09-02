"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

/**
 * Único envoltorio de imagen remota de la app. Fija las decisiones que antes cada `<img>`
 * crudo tomaba por su cuenta (o no tomaba):
 *
 * - **Reserva el espacio** siempre: en modo `fill` el contenedor declara su `aspect-ratio`
 *   por `contenedorClassName`; en modo fijo, `width`/`height`. El contenido alrededor no
 *   salta cuando la foto llega.
 * - **Placeholder** mientras carga: fondo `ink-100` con `animate-pulse` (quieto para quien
 *   pidió menos movimiento). La imagen aparece con un fundido corto encima.
 * - **`onError`**: si la URL no resuelve, muestra `fallback` (una inicial, un ícono) en el
 *   mismo hueco; si no se pasó `fallback`, queda el fondo neutro. El layout no se rompe.
 * - **`sizes`** obligatorio en modo `fill` para que la optimización pida el ancho real y no
 *   baje la foto full-res dentro de una miniatura.
 * - `loading="lazy"` salvo `priority` (la primera imagen visible de la pantalla).
 */

type PropsBase = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  contenedorClassName?: string;
  fallback?: React.ReactNode;
};

type PropsFill = PropsBase & {
  fill: true;
  /** Requerido en modo `fill`: describe el ancho de render en cada breakpoint. */
  sizes: string;
  width?: never;
  height?: never;
};

type PropsFijo = PropsBase & {
  fill?: false;
  width: number;
  height: number;
  sizes?: string;
};

export type ImagenProps = PropsFill | PropsFijo;

export function Imagen(props: ImagenProps) {
  const {
    src,
    alt,
    priority,
    className = "",
    contenedorClassName = "",
    fallback,
  } = props;
  const [estado, setEstado] = useState<"cargando" | "lista" | "error">("cargando");

  // Si la imagen ya estaba en caché, `onLoad` puede no dispararse tras la hidratación.
  const refImg = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setEstado((e) => (e === "cargando" ? "lista" : e));
    }
  }, []);

  if (estado === "error" && fallback !== undefined) {
    return <>{fallback}</>;
  }

  const comunes = {
    src,
    priority,
    ref: refImg,
    loading: priority ? undefined : ("lazy" as const),
    onLoad: () => setEstado("lista"),
    onError: () => setEstado("error"),
  };

  const claseImg = `object-cover transition-opacity duration-300 ${
    estado === "lista" ? "opacity-100" : "opacity-0"
  } ${className}`;

  const placeholder =
    estado === "cargando" ? (
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-ink-100 motion-safe:animate-pulse"
      />
    ) : null;

  if (props.fill) {
    return (
      <span className={`relative block overflow-hidden bg-ink-100 ${contenedorClassName}`}>
        <Image {...comunes} alt={alt} fill sizes={props.sizes} className={claseImg} />
        {placeholder}
      </span>
    );
  }

  const { width, height } = props;
  return (
    <span
      className={`relative inline-block overflow-hidden bg-ink-100 ${contenedorClassName}`}
      style={{ width, height }}
    >
      <Image
        {...comunes}
        alt={alt}
        width={width}
        height={height}
        sizes={props.sizes}
        className={`h-full w-full ${claseImg}`}
      />
      {placeholder}
    </span>
  );
}
