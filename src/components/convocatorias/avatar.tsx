import { Imagen } from "@/components/ui/imagen";

/** Foto redonda de una persona, o su inicial si no tiene foto. */
export function Avatar({ url, nombre, size }: { url: string | null; nombre: string; size: number }) {
  return url ? (
    <Imagen
      src={url}
      alt={nombre}
      width={size}
      height={size}
      contenedorClassName="shrink-0 rounded-full"
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-texto-tenue"
      style={{ width: size, height: size }}
    >
      {nombre[0]}
    </span>
  );
}
