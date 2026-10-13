import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { useTranslations } from "use-intl";
import { BUCKET_FOTOS } from "@/lib/perfil-talento";
import { llamarApi } from "~/lib/api";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { Tarjeta } from "~/ui/basicos";
import { Boton } from "~/ui/boton";
import { Cobertura } from "~/ui/iniciativas/cobertura";
import { leerEquipo, type DetalleEquipo } from "~/ui/iniciativas/datos";
import { FormularioEquipo } from "~/ui/iniciativas/formulario-equipo";
import { FotosIniciativa } from "~/ui/iniciativas/fotos-iniciativa";
import { ConfirmarBorrado, EtiquetaTipo } from "~/ui/iniciativas/piezas";
import { Volver } from "~/ui/iniciativas/volver";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, useColores } from "~/ui/tema";

/**
 * La pantalla de un Equipo (#341, `GestionEquipo` de la web): editarlo, sus fotos, buscar
 * talento, quiénes están, cerrarlo o eliminarlo. Solo para quien lo armó.
 */
export default function Equipo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations("proyectos.equipo");
  const tUi = useTranslations("cuenta.ui");
  const tNo = useTranslations("cuenta.noEncontrado");
  const tc = useTranslations("comun");
  const color = useColores();
  const { sesion } = useSesion();
  const userId = sesion?.user.id;
  const [d, setD] = useState<DetalleEquipo | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (id) setD(await leerEquipo(id, userId));
  }, [id, userId]);

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
  if (!d || !userId) {
    return (
      <Pantalla>
        <Volver texto={tc("volver")} />
        <Texto variante="titulo">{tNo("titulo")}</Texto>
        <Texto variante="tenue">{tNo("detalle")}</Texto>
      </Pantalla>
    );
  }

  const { equipo, fotos, cobertura } = d;

  async function desactivar() {
    setError(null);
    setCargando(true);
    const { error: e } = await supabase
      .from("equipos")
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq("id", equipo.id);
    setCargando(false);
    if (e) return setError(t("errorCerrar"));
    // Cerrado: su espacio en Discord queda de solo lectura (#269).
    await llamarApi("discord", { accion: "iniciativa", equipoId: equipo.id });
    cargar();
  }

  // #215: eliminar de verdad. Por cascada se van intereses, matches, convocatorias y la sala
  // (0083): sus Talentos vuelven a Buscar Talentos. Mismo recorrido que «Borrar proyecto».
  async function borrar() {
    setError(null);
    setCargando(true);
    // Las rutas antes de borrar: `fotos_equipo` cae en cascada. Si esto falla, no se borra nada.
    const { data: actuales, error: errorFotos } = await supabase
      .from("fotos_equipo")
      .select("storage_path")
      .eq("equipo_id", equipo.id);
    if (errorFotos) {
      setCargando(false);
      return setError(t("errorEliminar"));
    }
    // Los ids de sus canales de Discord, antes de que la sala caiga en cascada (#269).
    const r = await llamarApi<{ permiso: unknown }>("discord", { accion: "canales-para-borrar", equipoId: equipo.id });
    // Primero la fila y después el Storage: si el borrado falla, el equipo queda entero.
    const { error: e } = await supabase.from("equipos").delete().eq("id", equipo.id);
    if (e) {
      setCargando(false);
      return setError(t("errorEliminar"));
    }
    if (r.ok && r.permiso) await llamarApi("discord", { accion: "borrar-canales", permiso: r.permiso });
    const rutas = (actuales ?? []).map((f) => f.storage_path);
    // Un archivo que no se borre queda huérfano, pero el equipo ya no existe: no se avisa.
    if (rutas.length > 0) await supabase.storage.from(BUCKET_FOTOS).remove(rutas);
    router.replace("/(tabs)/iniciativas" as Href);
  }

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
      <EtiquetaTipo tipo="equipo" texto={t("armarEquipo")} />
      <Texto variante="titulo" accessibilityRole="header">
        {equipo.titulo}
      </Texto>
      {equipo.cupo != null && <Texto variante="tenue">{t("hastaIntegrantes", { cupo: equipo.cupo })}</Texto>}
      {!!equipo.descripcion && <Texto>{equipo.descripcion}</Texto>}

      {editando ? (
        <FormularioEquipo
          creadorId={userId}
          equipo={equipo}
          alTerminar={() => {
            setEditando(false);
            cargar();
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <Boton onPress={() => router.push(`/talentos?equipo=${equipo.id}` as Href)}>{t("buscarTalento")}</Boton>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditando(true)}
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
              <Ionicons name="swap-horizontal-outline" size={15} color={color.texto} />
              <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{t("editar")}</Texto>
            </Pressable>
            <Texto
              accessibilityRole="button"
              variante="tenue"
              style={{ fontFamily: fuente.media, opacity: cargando ? 0.5 : 1 }}
              onPress={cargando ? undefined : desactivar}
            >
              {t("cerrar")}
            </Texto>
          </View>

          <FotosIniciativa
            tipo="equipo"
            iniciativaId={equipo.id}
            creadorId={userId}
            fotos={fotos}
            onCambio={(f) => setD((prev) => (prev ? { ...prev, fotos: typeof f === "function" ? f(prev.fotos) : f } : prev))}
          />

          <Tarjeta style={{ backgroundColor: color.fondoSutil }}>
            <Texto variante="tenue">
              {t.rich("ayudaSumar", { b: (txt) => <Texto style={{ fontFamily: fuente.media }}>{txt}</Texto> })}
            </Texto>
          </Tarjeta>

          <Cobertura filas={cobertura} esEquipo alCambiar={cargar} />

          <View style={{ borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 12, gap: 8 }}>
            {error && <Texto variante="error">{error}</Texto>}
            {!confirmarBorrado ? (
              <Texto
                accessibilityRole="button"
                style={{ color: color.error }}
                onPress={() => {
                  setError(null);
                  setConfirmarBorrado(true);
                }}
              >
                {t("eliminar")}
              </Texto>
            ) : (
              <ConfirmarBorrado
                mensaje={t("confirmarBorrado", { palabra: tUi("palabraBorrar") })}
                textoBoton={t("eliminarDefinitivamente")}
                cargando={cargando}
                onConfirmar={borrar}
                onCancelar={() => setConfirmarBorrado(false)}
              />
            )}
          </View>
        </>
      )}
    </Pantalla>
  );
}
