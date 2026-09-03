import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { etiquetaDisciplina } from "@/lib/constantes";
import { CREMA, NARANJA } from "@/app/_marca-icono";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Perfil en Yalope";

const INK_900 = "#18161a";
const INK_600 = "#5c565f";

function Marca() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: NARANJA }}>
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke={NARANJA}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 21V13.5" />
        <path d="M12 13.5C10.8 10.6 8.9 7.7 6.2 5.2" />
        <path d="M12 13.5C11.3 11.6 10.4 10 9.1 8.6" />
        <path d="M12 13.5C13.2 10.6 15.1 7.7 17.8 5.2" />
        <path d="M12 13.5C12.7 11.6 13.6 10 14.9 8.6" />
      </svg>
      <div style={{ display: "flex", fontSize: 27, fontWeight: 800, letterSpacing: -1 }}>
        yalope
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

      // Satori (ImageResponse) no decodifica WebP, y las fotos de talento se guardan en
      // WebP. Se pide vía la transformación de Storage, que devuelve JPEG. Las de creador
      // son URLs externas de formato desconocido: para el OG no se arriesgan, va la
      // tarjeta de solo texto.
      const primera = perfil.fotos?.[0];
      if (primera && perfil.tipo === "talento") {
        foto = supabase.storage.from("fotos-perfil").getPublicUrl(primera, {
          transform: { width: 600, height: 800, resize: "cover" },
        }).data.publicUrl;
      }

      datos = [
        perfil.edad != null ? `${perfil.edad} años` : null,
        // Solo la localidad: "Caseros, Provincia de Buenos Aires, Argentina" no entra.
        perfil.ubicacion_publica?.split(",")[0]?.trim() || null,
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
            borderLeft: foto ? `6px solid ${NARANJA}` : "none",
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
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: NARANJA }}>
              {oficios}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
