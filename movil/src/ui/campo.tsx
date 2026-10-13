import { TextInput, View, type TextInputProps } from "react-native";
import { Texto } from "./texto";
import { useColores, fuente, radio } from "./tema";

/** Campo con etiqueta y error debajo, como `CampoTexto` de la web. 16 px: legible (#345). */
export function Campo({
  etiqueta,
  error,
  ...props
}: TextInputProps & { etiqueta: string; error?: string | null }) {
  const color = useColores();
  return (
    <View style={{ gap: 6 }}>
      <Texto variante="cuerpo" style={{ fontFamily: fuente.media, fontSize: 15 }}>
        {etiqueta}
      </Texto>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={color.textoTenue}
        {...props}
        style={{
          minHeight: 48,
          borderRadius: radio.campo,
          borderWidth: 1,
          borderColor: error ? color.error : color.borde,
          backgroundColor: color.fondoSutil,
          paddingHorizontal: 14,
          fontFamily: fuente.normal,
          fontSize: 16,
          color: color.texto,
        }}
      />
      {error ? <Texto variante="error">{error}</Texto> : null}
    </View>
  );
}
