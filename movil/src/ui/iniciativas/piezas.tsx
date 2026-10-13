import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useTranslations } from "use-intl";
import type { ItemTablero } from "@/lib/iniciativa-reglas";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";

// Los colores de las etiquetas de la web: Proyecto rojo (`brand-600`), Equipo coral (#101).
const ROJO_PROYECTO = "#c62703";
const CORAL_EQUIPO = "#fb6543";
const TINTA = "#0c0a0b";

/** «Proyecto» / «Equipo», con los mismos colores que en Explorar y Chats. */
export function EtiquetaTipo({ tipo, texto }: { tipo: "proyecto" | "equipo"; texto: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: tipo === "equipo" ? CORAL_EQUIPO : ROJO_PROYECTO,
      }}
    >
      <Texto
        style={{
          fontFamily: fuente.semi,
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: tipo === "equipo" ? TINTA : "#ffffff",
        }}
      >
        {texto}
      </Texto>
    </View>
  );
}

/** El estado de un Proyecto o Equipo en el tablero (`COLOR_ESTADO` de la web). */
export function EtiquetaEstado({ estado, texto }: { estado: ItemTablero["estado"]; texto: string }) {
  const color = useColores();
  const activo = estado === "publicada" || estado === "activo";
  const fondo = activo ? color.accion : estado === "borrador" ? color.ink100 : color.fondoSutil;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: fondo }}>
      <Texto
        style={{
          fontFamily: fuente.media,
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: activo ? color.accionTexto : color.textoTenue,
        }}
      >
        {texto}
      </Texto>
    </View>
  );
}

/** Foto redonda de una persona, o su inicial si no tiene foto. */
export function Avatar({ url, nombre, lado = 32 }: { url: string | null; nombre: string; lado?: number }) {
  const color = useColores();
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel={nombre}
        style={{ width: lado, height: lado, borderRadius: lado / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: lado,
        height: lado,
        borderRadius: lado / 2,
        backgroundColor: color.ink100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Texto variante="chico" style={{ fontFamily: fuente.semi }}>
        {nombre[0]}
      </Texto>
    </View>
  );
}

/** Píldoras de selección múltiple (los géneros buscados de un rol). */
export function Pildoras<T extends string>({
  opciones,
  elegidas,
  onAlternar,
}: {
  opciones: { valor: T; etiqueta: string }[];
  elegidas: T[];
  onAlternar: (v: T) => void;
}) {
  const color = useColores();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {opciones.map((o) => {
        const elegida = elegidas.includes(o.valor);
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: elegida }}
            onPress={() => onAlternar(o.valor)}
            style={{
              borderRadius: radio.pildora,
              borderWidth: 1,
              borderColor: elegida ? color.accion : color.borde,
              backgroundColor: elegida ? color.accion : "transparent",
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Texto style={{ fontSize: 14, color: elegida ? color.accionTexto : color.textoTenue }}>{o.etiqueta}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Un texto largo (sinopsis, descripción), con su etiqueta. */
export function CampoLargo({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  maxLength = 2000,
}: {
  etiqueta?: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const color = useColores();
  return (
    <View style={{ gap: 6 }}>
      {etiqueta && <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{etiqueta}</Texto>}
      <TextInput
        accessibilityLabel={etiqueta ?? placeholder}
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={color.textoTenue}
        multiline
        maxLength={maxLength}
        textAlignVertical="top"
        style={{
          minHeight: 96,
          borderRadius: radio.campo,
          borderWidth: 1,
          borderColor: color.borde,
          backgroundColor: color.fondoSutil,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 12,
          fontFamily: fuente.normal,
          fontSize: 16,
          color: color.texto,
        }}
      />
    </View>
  );
}

/**
 * Confirmación de una acción irreversible, como `ConfirmarBorrado` de la web: hay que escribir
 * la palabra (`cuenta.ui.palabraBorrar`) para habilitar el botón.
 */
export function ConfirmarBorrado({
  mensaje,
  textoBoton,
  cargando,
  onConfirmar,
  onCancelar,
}: {
  mensaje: string;
  textoBoton: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("cuenta.ui");
  const color = useColores();
  const palabra = t("palabraBorrar");
  const [texto, setTexto] = useState("");
  return (
    <View style={{ gap: 10 }}>
      <Texto>{mensaje}</Texto>
      <TextInput
        accessibilityLabel={t("escribiParaConfirmar", { palabra })}
        value={texto}
        onChangeText={setTexto}
        placeholder={palabra}
        placeholderTextColor={color.textoTenue}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: color.borde,
          borderRadius: radio.campo,
          paddingHorizontal: 14,
          fontFamily: fuente.normal,
          fontSize: 16,
          color: color.texto,
        }}
      />
      <Boton variante="peligro" disabled={texto.trim().toUpperCase() !== palabra} cargando={cargando} onPress={onConfirmar}>
        {cargando ? t("borrando") : textoBoton}
      </Boton>
      <Boton variante="secundario" disabled={cargando} onPress={onCancelar}>
        {t("cancelar")}
      </Boton>
    </View>
  );
}

/** Pantalla sin contenido (`EstadoVacio` de la web). */
export function EstadoVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  const color = useColores();
  return (
    <View
      style={{
        alignItems: "center",
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: color.borde,
        paddingHorizontal: 24,
        paddingVertical: 36,
        gap: 6,
      }}
    >
      <Texto style={{ fontFamily: fuente.media, textAlign: "center" }}>{titulo}</Texto>
      <Texto variante="tenue" style={{ textAlign: "center" }}>
        {detalle}
      </Texto>
    </View>
  );
}
