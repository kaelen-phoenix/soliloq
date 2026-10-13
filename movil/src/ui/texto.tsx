import { Text, type TextProps } from "react-native";
import { fuente, useColores } from "./tema";

type Variante = "titulo" | "subtitulo" | "cuerpo" | "tenue" | "chico" | "error";

const tipografia = {
  titulo: { fontFamily: fuente.negrita, fontSize: 26, lineHeight: 31 },
  subtitulo: { fontFamily: fuente.semi, fontSize: 18, lineHeight: 24 },
  cuerpo: { fontFamily: fuente.normal, fontSize: 16, lineHeight: 23 },
  tenue: { fontFamily: fuente.normal, fontSize: 15, lineHeight: 22 },
  chico: { fontFamily: fuente.normal, fontSize: 13, lineHeight: 19 },
  error: { fontFamily: fuente.media, fontSize: 14, lineHeight: 20 },
} as const;

export function Texto({ variante = "cuerpo", style, ...props }: TextProps & { variante?: Variante }) {
  const color = useColores();
  const tinte =
    variante === "error" ? color.error : variante === "tenue" || variante === "chico" ? color.textoTenue : color.texto;
  return <Text {...props} style={[tipografia[variante], { color: tinte }, style]} />;
}
