import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { etiquetaDisciplina } from "@/lib/constantes";
import { CREMA, FRAMBUESA } from "@/app/_marca-icono";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Perfil en Yalope";

const INK_900 = "#18161a";
const INK_600 = "#5c565f";

function Marca() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: FRAMBUESA }}>
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke={FRAMBUESA}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3.5 21V10.5C3.5 6 7.5 2.5 12 2.5S20.5 6 20.5 10.5V21" />
        <path d="M2 21h20" />
        <circle cx="12" cy="15.3" r="2" fill={FRAMBUESA} stroke="none" />
      </svg>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
        Yalope
      </div>
    </div>
  );
}

export default async function OgImagePerfil({ params }: { params: { token: string } }) {
  let nombre = "Yalope";
  let foto: string | null = null;
  let datos = "";
  let oficios = "";

  try {
    const supabase = createClient();
    const { data } = await supabase.rpc("perfil_publico", { p_token: params.token });
    const perfil = data?.[0];

    if (perfil) {
      nombre = perfil.nombre;

      const primera = perfil.fotos?.[0];
      if (primera) {
        foto =
          perfil.tipo === "talento"
            ? supabase.storage.from("fotos-perfil").getPublicUrl(primera).data.publicUrl
            : primera;
      }

      datos = [
        perfil.edad != null ? `${perfil.edad} años` : null,
        perfil.ubicacion_publica,
      ]
        .filter(Boolean)
        .join("  ·  ");

      oficios =
        perfil.tipo === "talento"
          ? (perfil.habilidades ?? []).slice(0, 4).join("  ·  ")
          : (perfil.disciplinas ?? []).slice(0, 4).map(etiquetaDisciplina).join("  ·  ");
    }
  } catch {
    // Cae a la tarjeta genérica de abajo.
  }

  const tamNombre = nombre.length > 24 ? 48 : nombre.length > 16 ? 58 : 70;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: CREMA }}>
        {foto ? (
          // Satori (ImageResponse) solo entiende <img>: `next/image` no aplica acá.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            width={468}
            height={630}
            style={{ width: 468, height: 630, objectFit: "cover" }}
          />
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 22,
            padding: foto ? 64 : 80,
            borderLeft: foto ? `6px solid ${FRAMBUESA}` : "none",
            alignItems: foto ? "flex-start" : "center",
            textAlign: foto ? "left" : "center",
          }}
        >
          <Marca />
          <div
            style={{
              display: "flex",
              fontSize: tamNombre,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: INK_900,
            }}
          >
            {nombre}
          </div>
          {datos ? (
            <div style={{ display: "flex", fontSize: 28, color: INK_600 }}>{datos}</div>
          ) : null}
          {oficios ? (
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: FRAMBUESA }}>
              {oficios}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
