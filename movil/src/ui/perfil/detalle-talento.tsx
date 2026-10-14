import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Linking, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import WebView from "react-native-webview";
import { useTranslations } from "use-intl";
import { claveDisciplina, claveGenero, claveRed, etiquetaHabilidad, familiaDeDisciplina, REDES, type ClaveRed, type Genero } from "@/lib/constantes";
import type { DisciplinaArtistica } from "@/lib/supabase/types";
import { parsearVideoreel, urlEmbedVideoreel } from "@/lib/videoreel";
import { Rotulo } from "../basicos";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/** Lo mismo que `TalentoDetalle` de la web (`perfil-talento-detalle.tsx`). */
export interface TalentoDetalle {
  nombre: string;
  edad: number | null;
  edad_visible: boolean;
  ubicacion_publica: string | null;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  formacion?: string | null;
  habilidades: string[];
  redes: Record<string, string>;
  fotos: { id: string; url: string; orden: number }[];
}

// Íconos de las redes: los mismos de la web, en el juego de íconos del teléfono.
const ICONO_RED: Record<ClaveRed, React.ComponentProps<typeof Ionicons>["name"]> = {
  instagram: "logo-instagram",
  youtube: "logo-youtube",
  tiktok: "logo-tiktok",
  x: "logo-twitter",
  linkedin: "logo-linkedin",
  vimeo: "logo-vimeo",
  sitio: "globe-outline",
};

/** Las fotos, deslizables de costado (como `GaleriaFotos`). */
function Galeria({ fotos, alt }: { fotos: string[]; alt: string }) {
  const { width } = useWindowDimensions();
  const t = useTranslations("perfil.galeria");
  if (fotos.length === 0) return null;
  const ancho = Math.min(width - 40, 420);
  return (
    <ScrollView horizontal pagingEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {fotos.map((url, i) => (
        <Image
          key={url}
          source={{ uri: url }}
          accessibilityLabel={`${alt} · ${t("ampliar", { n: i + 1, total: fotos.length })}`}
          style={{ width: i === 0 ? ancho * 0.8 : ancho * 0.6, aspectRatio: 4 / 5, borderRadius: radio.campo }}
          contentFit="cover"
          transition={150}
        />
      ))}
    </ScrollView>
  );
}

/**
 * El reproductor dentro de una página propia que el WebView carga «desde» yalope.com (#418):
 * YouTube rechaza (error 153) los reproductores que no dicen desde qué sitio se cargan, y un
 * WebView no lo informa solo como el navegador. Así se reproduce igual que en la web.
 */
function paginaReproductor(src: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${src}" referrerpolicy="strict-origin-when-cross-origin"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
allowfullscreen></iframe></body></html>`;
}

/** El videoreel de YouTube o Vimeo embebido (`VideoreelEmbed`). */
export function Videoreel({ url }: { url: string }) {
  const videoreel = parsearVideoreel(url);
  if (!videoreel) return null;
  const embed = urlEmbedVideoreel(videoreel);
  // Que se reproduzca en el lugar y no salte a pantalla completa sola (iPhone).
  const src = `${embed}${embed.includes("?") ? "&" : "?"}playsinline=1`;
  return (
    <View style={{ aspectRatio: 16 / 9, width: "100%", borderRadius: radio.campo, overflow: "hidden", backgroundColor: "#000" }}>
      <WebView
        source={{ html: paginaReproductor(src), baseUrl: "https://yalope.com/" }}
        originWhitelist={["*"]}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows={false}
        // Tocar el logo o «Ver en YouTube» abre la app o el navegador, no navega adentro del cuadro.
        onShouldStartLoadWithRequest={(pedido) => {
          if (!pedido.isTopFrame || pedido.url.startsWith("https://yalope.com") || pedido.url === "about:blank") return true;
          Linking.openURL(pedido.url).catch(() => {});
          return false;
        }}
        style={{ backgroundColor: "#000" }}
      />
    </View>
  );
}

/** Colores por familia de oficio, los mismos de la web (`CLASES_FAMILIA`). */
const FAMILIA = {
  escena: { fondo: "#fdf3ee", texto: "#c2410c" },
  direccion: { fondo: "#f1f2fd", texto: "#4338ca" },
  diseno: { fondo: "#f5f8ec", texto: "#65a30d" },
  tecnica: { fondo: "#ecf7fa", texto: "#0891b2" },
} as const;

export function EtiquetasDisciplina({
  disciplinas,
  otroDetalle,
}: {
  disciplinas: DisciplinaArtistica[];
  otroDetalle?: string | null;
}) {
  const t = useTranslations("perfil");
  const color = useColores();
  if (disciplinas.length === 0) return <Texto variante="tenue">{t("disciplinas.vacio")}</Texto>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {disciplinas.map((d) => {
        const familia = familiaDeDisciplina(d);
        const tinta = familia === "otro" ? { fondo: color.ink100, texto: color.texto } : FAMILIA[familia];
        return (
          <View key={d} style={{ borderRadius: radio.pildora, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: tinta.fondo }}>
            <Texto style={{ fontFamily: fuente.media, fontSize: 12, color: tinta.texto }}>
              {d === "otro" && otroDetalle ? otroDetalle : t(`etiquetas.${claveDisciplina(d)}`)}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}

/** El perfil de un Talento, como `PerfilTalentoDetalle` de la web. */
export function DetalleTalento({ talento, esPropio = false }: { talento: TalentoDetalle; esPropio?: boolean }) {
  const t = useTranslations("perfil.detalle");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const color = useColores();
  const fotos = [...talento.fotos].sort((a, b) => a.orden - b.orden).map((f) => f.url);
  const redes = REDES.filter((r) => talento.redes?.[r.clave]);
  const mostrarEdad = talento.edad != null && talento.edad_visible;
  // #250: en el perfil propio la edad oculta no se muestra; va un aviso.
  const avisoEdadOculta = esPropio && talento.edad != null && !talento.edad_visible;
  const genero =
    talento.genero_descripcion ||
    (talento.genero !== "sin_especificar" ? tEtiquetas(claveGenero(talento.genero)) : null);

  return (
    <View style={{ gap: 16 }}>
      <Galeria fotos={fotos} alt={talento.nombre} />

      <View style={{ gap: 2 }}>
        <Texto variante="titulo" accessibilityRole="header">
          {talento.nombre}
        </Texto>
        <Texto variante="tenue">
          {[mostrarEdad ? t("edad", { edad: talento.edad! }) : null, talento.ubicacion_publica].filter(Boolean).join(" · ")}
        </Texto>
        {avisoEdadOculta && <Texto variante="chico">{t("edadOculta")}</Texto>}
        {genero && <Texto variante="tenue">{genero}</Texto>}
      </View>

      {redes.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {redes.map((red) => (
            <Pressable
              key={red.clave}
              accessibilityRole="link"
              accessibilityLabel={tEtiquetas(claveRed(red.clave))}
              onPress={() => Linking.openURL(talento.redes[red.clave])}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: color.borde,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={ICONO_RED[red.clave]} size={18} color={color.textoTenue} />
            </Pressable>
          ))}
        </View>
      )}

      {talento.videoreel_url && <Videoreel url={talento.videoreel_url} />}

      {talento.experiencia && (
        <View style={{ gap: 4 }}>
          <Rotulo>{t("experiencia")}</Rotulo>
          <Texto>{talento.experiencia}</Texto>
        </View>
      )}

      {/* #379: si no la cargó, no aparece el apartado vacío. */}
      {talento.formacion && (
        <View style={{ gap: 4 }}>
          <Rotulo>{t("formacion")}</Rotulo>
          <Texto>{talento.formacion}</Texto>
        </View>
      )}

      {talento.habilidades.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {talento.habilidades.map((h) => (
            <View key={h} style={{ borderRadius: 6, backgroundColor: color.ink100, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Texto style={{ fontFamily: fuente.media, fontSize: 12 }}>{etiquetaHabilidad(h, tEtiquetas)}</Texto>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
