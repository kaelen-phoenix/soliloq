import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { Boton } from "~/ui/boton";
import { Pantalla } from "~/ui/pantalla";
import { Buscador } from "~/ui/talento/buscador";
import { fotoDeIniciativa, iniciativaParaBuscar } from "~/ui/talento/datos";
import type { IniciativaPlaca } from "~/ui/talento/pila-talentos";
import { Texto } from "~/ui/texto";
import { fuente, useColores } from "~/ui/tema";

/**
 * Buscar talento (`/talentos` de la web): se entra desde un Proyecto o un Equipo (#294) con
 * `?obra=…` o `?equipo=…`. Sin nada armado no hay para qué buscar: se manda a armarlo.
 */
export default function BuscarTalento() {
  const t = useTranslations("proyectos.talentos");
  const tc = useTranslations("comun");
  const color = useColores();
  const { obra, equipo } = useLocalSearchParams<{ obra?: string; equipo?: string }>();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [iniciativa, setIniciativa] = useState<IniciativaPlaca | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    let vigente = true;
    setIniciativa(undefined);
    (async () => {
      const i = await iniciativaParaBuscar(userId, { obra, equipo });
      const conFoto = i ? { ...i, fotoUrl: await fotoDeIniciativa(i) } : null;
      if (vigente) setIniciativa(conFoto);
    })();
    return () => {
      vigente = false;
    };
  }, [userId, obra, equipo]);

  return (
    <Pantalla>
      <Boton variante="fantasma" onPress={() => router.back()}>
        {tc("volver")}
      </Boton>
      {iniciativa === undefined ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={color.texto} />
        </View>
      ) : iniciativa === null ? (
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <Ionicons name="search-outline" size={28} color={color.textoTenue} />
          <Texto variante="subtitulo" style={{ textAlign: "center" }}>{t("sinIniciativaTitulo")}</Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>{t("sinIniciativaDetalle")}</Texto>
          <Boton onPress={() => router.replace("/iniciativas" as Href)}>{t("irAIniciativas")}</Boton>
        </View>
      ) : (
        <>
          <Texto variante="tenue">
            {t.rich("bajada", {
              titulo: iniciativa.titulo,
              b: (txt) => <Texto style={{ fontFamily: fuente.media }}>{txt}</Texto>,
            })}
          </Texto>
          {/* #372: la `key` hace que buscar para otra iniciativa arranque de cero. */}
          <Buscador key={`${iniciativa.tipo}-${iniciativa.id}`} iniciativa={iniciativa} />
        </>
      )}
    </Pantalla>
  );
}
