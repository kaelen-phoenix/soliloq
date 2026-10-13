import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { agruparCobertura, type FilaCobertura } from "@/lib/iniciativa-reglas";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Rotulo, Tarjeta } from "../basicos";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { Avatar } from "./piezas";

/**
 * Quién ocupa cada rol (Proyecto) o quién participa (Equipo), #152 — `CoberturaIniciativa` de
 * la web. Tocar a alguien abre su perfil; «Quitar» lo da de baja (`dar_de_baja_convocado`, lo
 * mismo que en Convocatorias) y libera el lugar.
 */
export function Cobertura({
  filas,
  esEquipo,
  alCambiar,
}: {
  filas: FilaCobertura[];
  esEquipo: boolean;
  alCambiar: () => void;
}) {
  const t = useTranslations("proyectos.cobertura");
  const tc = useTranslations("comun");
  const tErrores = useTranslations("proyectos.matches.errores");
  const color = useColores();
  const sinNombre = t("talento");
  const grupos = useMemo(() => agruparCobertura(filas, sinNombre), [filas, sinNombre]);
  const [error, setError] = useState<string | null>(null);

  if (grupos.length === 0) return null;

  function confirmarQuitar(convocatoriaId: string) {
    Alert.alert(t("confirmar"), esEquipo ? t("confirmarQuitarEquipo") : t("confirmarQuitarRol"), [
      { text: tc("cancelar"), style: "cancel" },
      { text: t("quitar"), style: "destructive", onPress: () => quitar(convocatoriaId) },
    ]);
  }

  async function quitar(convocatoriaId: string) {
    const { error: e } = await supabase.rpc("dar_de_baja_convocado", { p_convocatoria_id: convocatoriaId });
    if (e) return setError(tErrores("darDeBaja"));
    setError(null);
    // Sale de la sala: también de su espacio de Discord, si hay (#269).
    llamarApi("discord", { accion: "mis-espacios" });
    alCambiar();
  }

  const totalOcupados = grupos.reduce((n, g) => n + g.ocupantes.length, 0);
  const totalLugares = grupos.reduce((n, g) => n + g.vacantes, 0);

  const persona = (o: { convocatoriaId: string; talentoId: string; nombre: string; fotoUrl: string | null }) => (
    <View key={o.convocatoriaId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/talentos/${o.talentoId}` as Href)}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Avatar url={o.fotoUrl} nombre={o.nombre} />
        <Texto numberOfLines={1} style={{ flex: 1 }}>
          {o.nombre}
        </Texto>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => confirmarQuitar(o.convocatoriaId)}
        style={{ borderWidth: 1, borderColor: color.error, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Texto style={{ fontSize: 12, fontFamily: fuente.media, color: color.error }}>{t("quitar")}</Texto>
      </Pressable>
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      <Rotulo>
        {esEquipo
          ? t("participantes", { ocupados: totalOcupados, lugares: totalLugares })
          : t("rolesCubiertos", { ocupados: totalOcupados, lugares: totalLugares })}
      </Rotulo>
      {error && <Texto variante="error">{error}</Texto>}
      {grupos.map((g) => {
        const disponibles = g.vacantes - g.ocupantes.length;
        // Un rol de una vacante se lee mejor en una sola línea: «Actriz — Disponible».
        if (!esEquipo && g.vacantes === 1) {
          const unico = g.ocupantes[0] ?? null;
          return (
            <View
              key={g.rolId ?? "rol"}
              style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, padding: 12, gap: 8 }}
            >
              <Texto style={{ fontFamily: fuente.media }} numberOfLines={1}>
                {g.rolNombre}
              </Texto>
              {unico ? persona(unico) : <Texto variante="tenue">{t("disponible")}</Texto>}
            </View>
          );
        }
        return (
          <Tarjeta key={g.rolId ?? "equipo"} style={{ padding: 12, gap: 8 }}>
            {!esEquipo && (
              <Texto style={{ fontFamily: fuente.media }}>
                {t("rolCubierto", { rol: g.rolNombre ?? "", ocupados: g.ocupantes.length, vacantes: g.vacantes })}
              </Texto>
            )}
            {g.ocupantes.map(persona)}
            {disponibles > 0 && (
              <Texto variante="tenue">
                {esEquipo ? t("lugaresDisponibles", { n: disponibles }) : t("vacantesDisponibles", { n: disponibles })}
              </Texto>
            )}
          </Tarjeta>
        );
      })}
    </View>
  );
}
