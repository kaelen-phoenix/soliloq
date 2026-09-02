import { ImageResponse } from "next/og";
import { MarcaIcono } from "../../_marca-icono";

export function GET() {
  return new ImageResponse(<MarcaIcono lado={512} radio={108} />, { width: 512, height: 512 });
}
