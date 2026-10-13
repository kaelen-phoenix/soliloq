import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

/** Foto redonda o la inicial, como `Avatar` de la web. */
export function Avatar({ url, nombre, tam = 40, cuadrado = false }: { url: string | null; nombre: string; tam?: number; cuadrado?: boolean }) {
  const color = useColores();
  const forma = { width: tam, height: tam, borderRadius: cuadrado ? radio.campo : tam / 2 };
  if (url) return <Image source={{ uri: url }} accessibilityLabel={nombre} style={forma} contentFit="cover" />;
  return (
    <View style={[forma, { backgroundColor: color.ink100, alignItems: "center", justifyContent: "center", padding: 2 }]}>
      <Texto
        numberOfLines={cuadrado ? 3 : 1}
        style={{ fontFamily: fuente.semi, fontSize: cuadrado ? 10 : tam * 0.36, color: color.textoTenue, textAlign: "center" }}
      >
        {cuadrado ? nombre : nombre[0]}
      </Texto>
    </View>
  );
}

export type TonoChip = "neutro" | "alerta" | "accion";

/** El chip de estado (Para convocar, Esperando confirmación, En la sala…). */
export function Chip({ texto, tono }: { texto: string; tono: TonoChip }) {
  const color = useColores();
  const estilos = {
    neutro: { fondo: color.fondoSutil, texto: color.textoTenue },
    alerta: { fondo: "rgb(46,34,20)", texto: "rgb(240,200,140)" },
    accion: { fondo: color.accion, texto: color.accionTexto },
  }[tono];
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: estilos.fondo }}>
      <Texto style={{ fontFamily: fuente.semi, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: estilos.texto }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Botón chico con borde (las acciones de cada fila); `peligro` va en rojo. */
export function BotonChico({
  texto,
  onPress,
  peligro,
  deshabilitado,
}: {
  texto: string;
  onPress: () => void;
  peligro?: boolean;
  deshabilitado?: boolean;
}) {
  const color = useColores();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: peligro ? color.error : color.borde,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        opacity: deshabilitado ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Texto style={{ fontFamily: fuente.media, fontSize: 13, color: peligro ? color.error : color.texto }}>{texto}</Texto>
    </Pressable>
  );
}

/** Una ventana sobre la pantalla (como `Superposicion` de la web): tocar afuera la cierra. */
export function Ventana({
  visible,
  onCerrar,
  etiqueta,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  const color = useColores();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} accessibilityLabel={etiqueta}>
      <Pressable
        accessibilityLabel={etiqueta}
        onPress={onCerrar}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        {/* Los toques adentro no cierran. */}
        <Pressable
          onPress={() => {}}
          style={{ width: "100%", maxWidth: 340, borderRadius: radio.tarjeta, backgroundColor: color.superficie, padding: 20, gap: 12 }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
