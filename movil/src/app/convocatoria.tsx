import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import type { FilaConvocatoria } from "@/lib/convocatoria-talento";
import { Tarjeta } from "~/ui/basicos";
import { Boton } from "~/ui/boton";
import { CabeceraConvocatoria, leerConvocatorias, responderConvocatoria } from "~/ui/explorar/convocatoria";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, useColores } from "~/ui/tema";

/** Las convocatorias definitivas pendientes del Talento (`/convocatoria` de la web, #143). */
export default function Convocatoria() {
  const t = useTranslations("proyectos.convocatoria");
  const tErrores = useTranslations("proyectos.convocatoria.errores");
  const tComun = useTranslations("comun");
  const color = useColores();
  const [filas, setFilas] = useState<FilaConvocatoria[] | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      leerConvocatorias().then(setFilas);
    }, []),
  );

  async function responder(f: FilaConvocatoria, aceptar: boolean) {
    setOcupadoId(f.convocatoriaId);
    const clave = await responderConvocatoria(f.convocatoriaId, aceptar);
    setOcupadoId(null);
    if (clave) return setError(tErrores(clave));
    setError(null);
    setFilas((prev) => (prev ?? []).filter((x) => x.convocatoriaId !== f.convocatoriaId));
    // Si aceptó, ya está en la sala: a Chats.
    if (aceptar) router.replace("/chats" as Href);
  }

  return (
    <Pantalla>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
      >
        <Ionicons name="chevron-back" size={18} color={color.textoTenue} />
        <Texto variante="tenue" style={{ fontFamily: fuente.media }}>
          {tComun("volver")}
        </Texto>
      </Pressable>
      <Texto variante="titulo" accessibilityRole="header">
        {t("metaTitulo")}
      </Texto>
      <Texto variante="tenue">{t("bajada")}</Texto>
      {error && <Texto variante="error">{error}</Texto>}

      {filas === null ? (
        <ActivityIndicator color={color.texto} />
      ) : filas.length === 0 ? (
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
          <Ionicons name="heart-outline" size={32} color={color.textoTenue} />
          <Texto style={{ fontFamily: fuente.media, textAlign: "center" }}>{t("vacioTitulo")}</Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>
            {t("vacioDetalle")}
          </Texto>
        </View>
      ) : (
        filas.map((f) => (
          <Tarjeta key={f.convocatoriaId} style={{ gap: 14 }}>
            <CabeceraConvocatoria
              fila={f}
              texto={t.rich("teConvocaA", {
                nombre: f.creadorNombre,
                titulo: f.iniciativaTitulo,
                b: (c) => <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{c}</Texto>,
              })}
            />
            <Boton onPress={() => responder(f, true)} cargando={ocupadoId === f.convocatoriaId}>
              {t("aceptar")}
            </Boton>
            <Boton variante="fantasma" disabled={ocupadoId === f.convocatoriaId} onPress={() => responder(f, false)}>
              {t("ahoraNoPuedo")}
            </Boton>
          </Tarjeta>
        ))
      )}
    </Pantalla>
  );
}
