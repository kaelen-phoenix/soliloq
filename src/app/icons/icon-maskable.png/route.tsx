import { ImageResponse } from "next/og";
import { MarcaIcono } from "../../_marca-icono";

// Maskable: el recorte se lo pone el sistema, el fondo va lleno y el dibujo con margen.
export function GET() {
  return new ImageResponse(<MarcaIcono lado={512} radio={0} />, { width: 512, height: 512 });
}
