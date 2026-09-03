import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "./_logo-datauri";
import { TINTA } from "./_marca-icono";

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
          alignItems: "center",
          justifyContent: "center",
          background: TINTA,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} alt="" width={1040} height={693} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
