import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { aEquipoFeed, aRolFeed } from "@/lib/feed-roles";
import type { EquipoFeed, RolFeed } from "@/lib/feed-tipos";
import type { UnidadDistancia } from "@/lib/ubicacion";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { PilaTarjetas } from "~/ui/explorar/pila-tarjetas";
import { useColores } from "~/ui/tema";

interface Feed {
  radio: number | null;
  unidad: UnidadDistancia;
  roles: RolFeed[];
  equipos: EquipoFeed[];
  mostrarEjemplos: boolean;
}

const urlPublica = (p: string) => supabase.storage.from("fotos-perfil").getPublicUrl(p).data.publicUrl;

/** Lo mismo que lee `FeedTalento` en la web. */
async function leerFeed(talentoId: string): Promise<Feed> {
  const { data: perfil } = await supabase
    .from("perfiles_talento")
    .select("radio_busqueda_metros, unidad_distancia, onboarding_visto_en")
    .eq("id", talentoId)
    .single();
  // El radio viaja a Postgres: el filtro por distancia se resuelve en la query.
  const radio = perfil?.radio_busqueda_metros ?? null;
  const [{ data: roles }, { data: equipos }] = await Promise.all([
    supabase.rpc("feed_para_talento", { p_talento_id: talentoId, p_radio_metros: radio }),
    supabase.rpc("feed_equipos_para_talento"),
  ]);
  return {
    radio,
    unidad: (perfil?.unidad_distancia as UnidadDistancia) ?? "km",
    roles: (roles ?? []).map((r) => aRolFeed(r, urlPublica)),
    equipos: (equipos ?? []).map((e) => aEquipoFeed(e, urlPublica)),
    // `null` es «todavía no lo vio»: el ejemplo lo ve todo el mundo una vez.
    mostrarEjemplos: !perfil?.onboarding_visto_en,
  };
}

/** Explorar: lo que se está armando (`/` de la web). Los propios viven en Iniciativas (#288). */
export default function Explorar() {
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [feed, setFeed] = useState<Feed | null>(null);
  // Cada vez que se vuelve a la pestaña se pide de nuevo, como al entrar a `/` en la web; la
  // pila se arma de cero con `key`.
  const [vuelta, setVuelta] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelado = false;
      leerFeed(userId).then((f) => {
        if (cancelado) return;
        setFeed(f);
        setVuelta((v) => v + 1);
      });
      return () => {
        cancelado = true;
      };
    }, [userId]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.superficie }} edges={["top", "left", "right"]}>
      {!feed || !userId ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.texto} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
          <PilaTarjetas
            key={vuelta}
            talentoId={userId}
            radioInicialMetros={feed.radio}
            unidadInicial={feed.unidad}
            rolesIniciales={feed.roles}
            equiposIniciales={feed.equipos}
            mostrarEjemplos={feed.mostrarEjemplos}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
