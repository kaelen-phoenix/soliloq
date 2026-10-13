import { Text, type TextProps } from "react-native";
import { color, fuente } from "./tema";

type Variante = "titulo" | "subtitulo" | "cuerpo" | "tenue" | "chico" | "error";

const estilos = {
  titulo: { fontFamily: fuente.negrita, fontSize: 26, lineHeight: 31, color: color.texto },
  subtitulo: { fontFamily: fuente.semi, fontSize: 18, lineHeight: 24, color: color.texto },
  cuerpo: { fontFamily: fuente.normal, fontSize: 16, lineHeight: 23, color: color.texto },
  tenue: { fontFamily: fuente.normal, fontSize: 15, lineHeight: 22, color: color.textoTenue },
  chico: { fontFamily: fuente.normal, fontSize: 13, lineHeight: 19, color: color.textoTenue },
  error: { fontFamily: fuente.media, fontSize: 14, lineHeight: 20, color: color.error },
} as const;

export function Texto({ variante = "cuerpo", style, ...props }: TextProps & { variante?: Variante }) {
  return <Text {...props} style={[estilos[variante], style]} />;
}
