import { ScrollView, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColores } from "./tema";

/** El marco de cada pantalla: fondo oscuro, márgenes seguros y scroll. */
export function Pantalla({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  const color = useColores();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.superficie }} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        {...props}
        contentContainerStyle={[{ padding: 20, gap: 16, flexGrow: 1 }, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
