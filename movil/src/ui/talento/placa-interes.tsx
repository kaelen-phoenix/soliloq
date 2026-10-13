import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente } from "../tema";
import { Avatar, Ventana } from "./comunes";

/**
 * La ventana «Hay interés» (#194, #365): las dos fotos y «Aceptar». No convoca ni descarta,
 * solo avisa; la usan Buscar talento (al formarse el match) y Convocatorias (los pendientes).
 */
export function PlacaInteres({
  visible,
  titulo,
  textoAceptar,
  persona,
  iniciativa,
  error,
  ocupado,
  onAceptar,
}: {
  visible: boolean;
  titulo: string;
  textoAceptar: string;
  persona: { nombre: string; fotoUrl: string | null };
  iniciativa: { titulo: string; fotoUrl: string | null };
  error?: string | null;
  ocupado?: boolean;
  onAceptar: () => void;
}) {
  return (
    <Ventana visible={visible} onCerrar={onAceptar} etiqueta={titulo}>
      <Texto
        accessibilityRole="header"
        style={{ textAlign: "center", fontFamily: fuente.semi, fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", color: "#e0623d" }}
      >
        {titulo}
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Avatar url={persona.fotoUrl} nombre={persona.nombre} tam={64} />
        <Ionicons name="heart" size={20} color="#e0623d" />
        <Avatar url={iniciativa.fotoUrl} nombre={iniciativa.titulo} tam={64} cuadrado />
      </View>
      {error && <Texto variante="error" style={{ textAlign: "center" }}>{error}</Texto>}
      <Boton onPress={onAceptar} cargando={ocupado}>
        {textoAceptar}
      </Boton>
    </Ventana>
  );
}
