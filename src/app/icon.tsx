import { ImageResponse } from "next/og";
import { MarcaIcono } from "./_marca-icono";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  // A 32px el trazo del isotipo es finito: se lo agranda casi a sangre para que se lea.
  return new ImageResponse(<MarcaIcono lado={32} radio={7} escala={0.96} />, { ...size });
}
