import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View, type ViewProps } from "react-native";
import { Texto } from "./texto";
import { fuente, radio, useColores } from "./tema";

/** Una caja con borde, como las secciones con `rounded-2xl border` de la web. */
export function Tarjeta({ style, ...props }: ViewProps) {
  const color = useColores();
  return (
    <View
      {...props}
      style={[{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.tarjeta, padding: 16, gap: 12 }, style]}
    />
  );
}

/** Título chico en mayúsculas de las secciones del perfil (`text-2xs uppercase`). */
export function Rotulo({ children }: { children: string }) {
  return (
    <Texto variante="chico" style={{ fontFamily: fuente.media, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>
      {children}
    </Texto>
  );
}

/** Casilla de verificación con su texto. */
export function Casilla({
  marcada,
  onCambio,
  children,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const color = useColores();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={() => onCambio(!marcada)}
      style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: marcada ? color.accion : color.borde,
          backgroundColor: marcada ? color.accion : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {marcada && <Ionicons name="checkmark" size={16} color={color.accionTexto} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/** Opciones excluyentes en píldoras (Ajustes: idioma, tema). */
export function Opciones<T extends string>({
  valor,
  opciones,
  onElegir,
  deshabilitado,
}: {
  valor: T;
  opciones: { valor: T; etiqueta: string }[];
  onElegir: (v: T) => void;
  deshabilitado?: boolean;
}) {
  const color = useColores();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {opciones.map((o) => {
        const elegida = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: elegida, disabled: deshabilitado }}
            disabled={deshabilitado}
            onPress={() => onElegir(o.valor)}
            style={{
              borderRadius: radio.pildora,
              borderWidth: 1,
              borderColor: elegida ? color.accion : color.borde,
              backgroundColor: elegida ? color.accion : "transparent",
              paddingHorizontal: 16,
              paddingVertical: 9,
              opacity: deshabilitado ? 0.5 : 1,
            }}
          >
            <Texto
              style={{ fontFamily: fuente.media, fontSize: 14, color: elegida ? color.accionTexto : color.textoTenue }}
            >
              {o.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Una fila de menú (Perfil → Ajustes, Cambiar contraseña…). */
export function FilaMenu({
  icono,
  texto,
  onPress,
  peligro,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  const color = useColores();
  const tinte = peligro ? color.error : color.texto;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icono} size={20} color={tinte} />
      <Texto style={{ flex: 1, color: tinte }}>{texto}</Texto>
      {!peligro && <Ionicons name="chevron-forward" size={18} color={color.textoTenue} />}
    </Pressable>
  );
}
