import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";
import { useColores, fuente, radio } from "./tema";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

/** Botón píldora, como en la web (#225): el primario con el color de acción. */
export function Boton({
  children,
  variante = "primario",
  cargando = false,
  disabled,
  ...props
}: PressableProps & { children: string; variante?: Variante; cargando?: boolean }) {
  const color = useColores();
  const inactivo = disabled || cargando;
  const relleno = variante === "primario" || variante === "peligro";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: cargando }}
      disabled={inactivo}
      {...props}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: radio.pildora,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        opacity: inactivo ? 0.6 : pressed ? 0.85 : 1,
        backgroundColor: variante === "primario" ? color.accion : variante === "peligro" ? color.error : "transparent",
        borderWidth: variante === "secundario" ? 1 : 0,
        borderColor: color.borde,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {cargando && <ActivityIndicator color={relleno ? color.accionTexto : color.texto} />}
        <Text
          style={{
            fontFamily: fuente.semi,
            fontSize: 16,
            color: relleno ? color.accionTexto : color.texto,
          }}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
