import { Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { ISOTIPO_TRAZOS, ISOTIPO_VIEWBOX } from "@/lib/marca-isotipo";
import { color } from "./tema";

const [, , ANCHO, ALTO] = ISOTIPO_VIEWBOX.split(" ").map(Number);

/** El isotipo de la marca, a dos tintas como en la web (`_marca-icono.tsx`). */
export function Isotipo({ alto = 40 }: { alto?: number }) {
  return (
    <Svg width={(alto * ANCHO) / ALTO} height={alto} viewBox={ISOTIPO_VIEWBOX} accessibilityElementsHidden>
      {ISOTIPO_TRAZOS.map((t, i) => (
        <G key={i} transform={`translate(${t.x},${t.y})`}>
          <Path d={t.d} fill={t.brazo === "izq" ? "#f2571e" : "#e62d03"} />
        </G>
      ))}
    </Svg>
  );
}

/** Isotipo + «yalope» en la redonda pesada del logotipo (Baloo 2, 800), como `MarcaYalope`. */
export function Marca() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Yalope"
      style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "center" }}
    >
      <Isotipo alto={44} />
      <Text style={{ fontFamily: "Baloo2_800ExtraBold", fontSize: 40, color: color.texto, marginTop: 6 }}>
        yalope
      </Text>
    </View>
  );
}
