import { ImageResponse } from "next/og";
import { MarcaIcono } from "../../_marca-icono";

export function GET() {
  return new ImageResponse(<MarcaIcono lado={192} radio={40} />, { width: 192, height: 192 });
}
