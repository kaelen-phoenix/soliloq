import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useTranslations } from "use-intl";
import { claveGenero } from "@/lib/constantes";
import { useSesion } from "~/lib/sesion";
import { Rotulo, Tarjeta } from "~/ui/basicos";
import { Boton } from "~/ui/boton";
import { AccionesObra } from "~/ui/iniciativas/acciones-obra";
import { Cobertura } from "~/ui/iniciativas/cobertura";
import { leerObra, type DetalleObra } from "~/ui/iniciativas/datos";
import { FormularioRol } from "~/ui/iniciativas/formulario-rol";
import { FotosIniciativa } from "~/ui/iniciativas/fotos-iniciativa";
import { Metricas } from "~/ui/iniciativas/metricas";
import { Volver } from "~/ui/iniciativas/volver";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores } from "~/ui/tema";

/**
 * La pantalla de un Proyecto (`/obras/[id]` de la web). El dueño la gestiona: editar, fotos,
 * publicar o cerrar la convocatoria, roles con quién los ocupa (#152), agregar roles, buscar
 * talento y el rendimiento. Cualquier otra persona ve la convocatoria: datos, fotos y roles.
 */
export default function Obra() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations("proyectos.obra");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const tFotos = useTranslations("proyectos.fotos");
  const tNo = useTranslations("cuenta.noEncontrado");
  const tc = useTranslations("comun");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [d, setD] = useState<DetalleObra | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setD(await leerObra(id, userId));
    setVersion((v) => v + 1);
  }, [id, userId]);

  // Al volver de editar se relee.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (d === undefined) {
    return (
      <Pantalla>
        <ActivityIndicator color={color.texto} />
      </Pantalla>
    );
  }
  if (!d) {
    return (
      <Pantalla>
        <Volver texto={tc("volver")} />
        <Texto variante="titulo">{tNo("titulo")}</Texto>
        <Texto variante="tenue">{tNo("detalle")}</Texto>
      </Pantalla>
    );
  }

  const { obra, roles, fotos, cobertura } = d;
  const esDueno = userId === obra.creador_id;

  return (
    <Pantalla
      refreshControl={
        <RefreshControl
          refreshing={recargando}
          tintColor={color.texto}
          onRefresh={async () => {
            setRecargando(true);
            await cargar();
            setRecargando(false);
          }}
        />
      }
    >
      <Volver texto={tc("volver")} />
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Texto variante="titulo" accessibilityRole="header" style={{ flex: 1 }}>
          {obra.titulo}
        </Texto>
        {esDueno && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/iniciativa/editar-proyecto/${obra.id}` as Href)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: color.borde,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Ionicons name="create-outline" size={15} color={color.texto} />
            <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{t("editar")}</Texto>
          </Pressable>
        )}
      </View>
      <Texto variante="tenue">{obra.ubicacion_texto}</Texto>

      {esDueno && obra.estado !== "cerrada" && (
        <Boton onPress={() => router.push(`/talentos?obra=${obra.id}` as Href)}>{t("buscarTalento")}</Boton>
      )}
      {!!obra.sinopsis && <Texto variante="tenue">{obra.sinopsis}</Texto>}

      {esDueno ? (
        <FotosIniciativa
          tipo="obra"
          iniciativaId={obra.id}
          creadorId={obra.creador_id}
          fotos={fotos}
          onCambio={(f) => setD((prev) => (prev ? { ...prev, fotos: typeof f === "function" ? f(prev.fotos) : f } : prev))}
          onSubiendo={setSubiendoFoto}
        />
      ) : (
        fotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {fotos.map((f) => (
              <Image
                key={f.id}
                source={{ uri: f.url }}
                accessibilityLabel={tFotos("altObra")}
                style={{ width: 180, aspectRatio: 3 / 4, borderRadius: radio.campo }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )
      )}

      {esDueno && (
        <AccionesObra
          obraId={obra.id}
          estado={obra.estado}
          fotosPaths={fotos.map((f) => f.storage_path)}
          subiendoFoto={subiendoFoto}
          alCambiar={cargar}
          alBorrar={() => router.replace("/(tabs)/iniciativas" as Href)}
        />
      )}

      <View style={{ gap: 10 }}>
        {roles.length === 0 && (
          <>
            <Rotulo>{t("roles")}</Rotulo>
            <Texto variante="tenue">{t("sinRoles")}</Texto>
          </>
        )}
        {esDueno ? (
          // Quién ocupa cada rol y quién falta convocar (#152).
          <Cobertura filas={cobertura} esEquipo={false} alCambiar={cargar} />
        ) : (
          roles.length > 0 && (
            <>
              <Rotulo>{t("roles")}</Rotulo>
              {roles.map((rol) => (
                <Tarjeta key={rol.id} style={{ gap: 2, padding: 14 }}>
                  <Texto style={{ fontFamily: fuente.media }} numberOfLines={1}>
                    {rol.nombre}
                  </Texto>
                  <Texto variante="chico">
                    {rol.tipo === "actuacion" || rol.tipo === "tecnica" ? t(`tipo.${rol.tipo}`) : rol.tipo}
                    {rol.edad_minima && rol.edad_maxima
                      ? ` · ${t("rangoEdad", { min: rol.edad_minima, max: rol.edad_maxima })}`
                      : ""}
                  </Texto>
                  <Texto variante="chico">
                    {rol.generos_buscados.length === 0
                      ? t("cualquierGenero")
                      : rol.generos_buscados.map((g) => tEtiquetas(claveGenero(g))).join(", ")}
                  </Texto>
                </Tarjeta>
              ))}
            </>
          )
        )}
        {esDueno && <FormularioRol obraId={obra.id} alAgregar={cargar} />}
      </View>

      {esDueno && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Rotulo>{t("rendimiento")}</Rotulo>
          <Metricas obraId={obra.id} version={version} />
        </View>
      )}
    </Pantalla>
  );
}
