import { ImageResponse } from "next/og";
import { MarcaIcono } from "./_marca-icono";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<MarcaIcono lado={32} radio={7} />, { ...size });
}
