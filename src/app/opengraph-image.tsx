import { ImageResponse } from "next/og";
import { CREMA, FRAMBUESA, MarcaIcono } from "./_marca-icono";

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
          background: FRAMBUESA,
          color: CREMA,
        }}
      >
        <MarcaIcono lado={200} radio={0} />
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
          Yalope
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>Match teatral</div>
      </div>
    ),
    { ...size },
  );
}
