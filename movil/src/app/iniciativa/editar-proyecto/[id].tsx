import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { leerObra, type DetalleObra } from "~/ui/iniciativas/datos";
import { FormularioObra } from "~/ui/iniciativas/formulario-obra";
import { Volver } from "~/ui/iniciativas/volver";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { useColores } from "~/ui/tema";

/** Editar los datos de un Proyecto (#123, `/obras/[id]?editar=1` de la web). Solo el dueño. */
export default function EditarProyecto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations("proyectos.obra");
  const tNo = useTranslations("cuenta.noEncontrado");
  const tc = useTranslations("comun");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [detalle, setDetalle] = useState<DetalleObra | null | undefined>(undefined);

  useEffect(() => {
    if (id) leerObra(id, userId).then(setDetalle);
  }, [id, userId]);

  return (
    <Pantalla>
      <Volver texto={tc("volver")} />
      {detalle === undefined ? (
        <ActivityIndicator color={color.texto} />
      ) : !detalle || detalle.obra.creador_id !== userId ? (
        <>
          <Texto variante="titulo">{tNo("titulo")}</Texto>
          <Texto variante="tenue">{tNo("detalle")}</Texto>
        </>
      ) : (
        <>
          <Texto variante="titulo" accessibilityRole="header">
            {t("editarProyecto")}
          </Texto>
          <FormularioObra
            creadorId={detalle.obra.creador_id}
            obra={detalle.obra}
            alTerminar={() => router.back()}
            onCancelar={() => router.back()}
          />
        </>
      )}
    </Pantalla>
  );
}
