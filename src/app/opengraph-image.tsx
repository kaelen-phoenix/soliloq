import { ImageResponse } from "next/og";
import { CREMA, NARANJA, MarcaIcono } from "./_marca-icono";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Yalope — Match Teatral";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: NARANJA,
          color: CREMA,
        }}
      >
        <MarcaIcono lado={200} radio={0} />
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -3 }}>
          yalope
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>Match teatral</div>
      </div>
    ),
    { ...size },
  );
}
