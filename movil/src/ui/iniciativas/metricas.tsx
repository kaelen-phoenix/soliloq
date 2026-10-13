import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { resumirMetricas, type MetricasObra } from "@/lib/iniciativa-reglas";
import { supabase } from "~/lib/supabase";
import { Tarjeta } from "../basicos";
import { Texto } from "../texto";
import { fuente, useColores } from "../tema";
import { EstadoVacio } from "./piezas";

/** El rendimiento de la convocatoria (`MetricasObra` de la web, `metricas_obra`). */
export function Metricas({ obraId, version }: { obraId: string; version: number }) {
  const t = useTranslations("proyectos.metricas");
  const color = useColores();
  const [m, setM] = useState<MetricasObra | null | undefined>(undefined);

  useEffect(() => {
    supabase.rpc("metricas_obra", { p_obra_id: obraId }).then(({ data }) => setM(data?.[0] ?? null));
  }, [obraId, version]);

  if (m === undefined) return null;
  const r = resumirMetricas(m);
  if (r.estado === "sinRoles") return <EstadoVacio titulo={t("sinRolesTitulo")} detalle={t("sinRolesDetalle")} />;
  if (r.estado === "sinAlcance") return <EstadoVacio titulo={t("sinAlcanceTitulo")} detalle={t("sinAlcanceDetalle")} />;

  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
        {/* Número protagonista: para un dato único, un gráfico no agrega nada. */}
        <Texto style={{ fontFamily: fuente.semi, fontSize: 28, lineHeight: 30 }}>
          {r.tasa}
          <Texto variante="tenue"> %</Texto>
        </Texto>
        <Texto variante="chico">
          {t("seIntereso")}
          {"\n"}
          {t("dePersonas", { n: m!.alcance })}
        </Texto>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="chico" style={{ textTransform: "uppercase", fontSize: 11 }}>
            {t("interesMutuo")}
          </Texto>
          <Texto style={{ fontFamily: fuente.semi, fontSize: 18 }}>{m!.matches}</Texto>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="chico" style={{ textTransform: "uppercase", fontSize: 11 }}>
            {t("convocados")}
          </Texto>
          <Texto style={{ fontFamily: fuente.semi, fontSize: 18 }}>
            {r.convocados}
            <Texto variante="tenue"> {t("deCupo", { cupo: r.cupo })}</Texto>
          </Texto>
        </View>
      </View>
    </Tarjeta>
  );
}
