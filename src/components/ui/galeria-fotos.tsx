"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { usePrefiereReduccion } from "@/components/ui/movimiento";

/**
 * Grilla de fotos que al tocar una la abre a pantalla completa. El visor cierra con `Esc`,
 * con el fondo o con la X; con más de una foto, `←` / `→` y las flechas navegan. Bloquea el
 * scroll del fondo mientras está abierto y devuelve el foco a la miniatura al cerrar.
 */
export function GaleriaFotos({
  fotos,
  alt,
  className = "grid grid-cols-3 gap-2",
  itemClassName = "aspect-[3/4] rounded-xl",
}: {
  fotos: string[];
  alt: string;
  className?: string;
  itemClassName?: string;
}) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const prefiereReduccion = usePrefiereReduccion();
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const cerrar = useCallback(() => setAbierta(null), []);
  const ir = useCallback(
    (delta: number) =>
      setAbierta((i) => (i === null ? i : (i + delta + fotos.length) % fotos.length)),
    [fotos.length],
  );

  useEffect(() => {
    if (abierta === null) return;

    const foco = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
      foco?.focus?.();
    };
  }, [abierta, cerrar, ir]);

  if (fotos.length === 0) return null;

  const btnRedondo =
    "absolute z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

  return (
    <>
      <div className={className}>
        {fotos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setAbierta(i)}
            aria-label={`Ampliar foto ${i + 1} de ${fotos.length}`}
            className="group block w-full"
          >
            <Imagen
              src={url}
              alt={alt}
              fill
              sizes="(max-width: 640px) 33vw, 220px"
              contenedorClassName={itemClassName}
              className="transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {abierta !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 p-4"
            onClick={cerrar}
            initial={prefiereReduccion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefiereReduccion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              ref={cerrarRef}
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className={`${btnRedondo} right-3 top-3`}
            >
              <Icono nombre="cruz" className="h-5 w-5" />
            </button>

            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    ir(-1);
                  }}
                  aria-label="Foto anterior"
                  className={`${btnRedondo} left-3 top-1/2 -translate-y-1/2`}
                >
                  <Icono nombre="flecha-derecha" className="h-5 w-5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    ir(1);
                  }}
                  aria-label="Foto siguiente"
                  className={`${btnRedondo} right-3 top-1/2 -translate-y-1/2`}
                >
                  <Icono nombre="flecha-derecha" className="h-5 w-5" />
                </button>
              </>
            )}

            <div
              className="relative h-full max-h-[86vh] w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                key={abierta}
                src={fotos[abierta]}
                alt={alt}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {fotos.length > 1 && (
              <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium text-white/70">
                {abierta + 1} / {fotos.length}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
