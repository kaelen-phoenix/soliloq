import { ImageResponse } from "next/og";
import { MarcaIcono } from "./_marca-icono";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS le pone su propio recorte redondeado, así que el fondo va lleno (radio 0).
  return new ImageResponse(<MarcaIcono lado={180} radio={0} />, { ...size });
}
