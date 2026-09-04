import { ImageResponse } from "next/og";
import { MarcaIcono } from "../../_marca-icono";

// Maskable: el sistema recorta a círculo/squircle, así que el fondo va lleno (radio 0) y el
// dibujo más chico, dentro de la zona segura (~62% central).
export function GET() {
  return new ImageResponse(<MarcaIcono lado={512} radio={0} escala={0.62} />, {
    width: 512,
    height: 512,
  });
}
