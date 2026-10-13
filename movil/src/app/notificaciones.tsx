import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { destinoNotificacion, primeraFila } from "@/lib/notificaciones-reglas";
import type { TipoNotificacion } from "@/lib/supabase/types";
import { useSesion } from "~/lib/sesion";
import { supabase } from "~/lib/supabase";
import { abrirWeb } from "~/lib/web";
import { useNotificaciones } from "~/ui/notificaciones/campanita";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { fuente, radio, useColores } from "~/ui/tema";

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  leida_en: string | null;
  creado_en: string;
  obra_id: string | null;
  sala_id: string | null;
  titulo: string | null;
  /** Foto del Perfil de Talento de quien publicó el proyecto (#175). */
  proyectoFoto: string | null;
}

const urlFoto = (ruta: string) => supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl;

/** Lo mismo que lee `/notificaciones` en la web. */
async function leer(userId: string): Promise<{ lista: Notificacion[]; fotoPropia: string | null }> {
  const { data } = await supabase
    .from("notificaciones")
    .select("id, tipo, leida_en, creado_en, obra_id, rol_id, sala_id, de_perfil, obras(titulo, creador_id)")
    .eq("destinatario_id", userId)
    .order("creado_en", { ascending: false });
  const filas = data ?? [];
  const obraDe = (n: (typeof filas)[number]) =>
    primeraFila(n.obras as { titulo: string; creador_id: string } | { titulo: string; creador_id: string }[] | null);
  // La cara del proyecto es la de quien lo publica (#175): sale de su Perfil de Talento.
  const creadores = [...new Set(filas.map((n) => obraDe(n)?.creador_id).filter((x): x is string => !!x))];
  const [{ data: caras }, { data: foto }] = await Promise.all([
    creadores.length
      ? supabase.from("perfiles_talento").select("id, fotos_talento(storage_path, orden)").in("id", creadores)
      : Promise.resolve({ data: [] as { id: string; fotos_talento: { storage_path: string; orden: number }[] }[] }),
    supabase.from("fotos_talento").select("storage_path").eq("talento_id", userId).order("orden").limit(1).maybeSingle(),
  ]);
  const fotoPor = new Map(
    (caras ?? []).map((c) => {
      const principal = c.fotos_talento?.find((f) => f.orden === 0);
      return [c.id, principal ? urlFoto(principal.storage_path) : null];
    }),
  );
  return {
    lista: filas.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      leida_en: n.leida_en,
      creado_en: n.creado_en,
      obra_id: n.obra_id,
      sala_id: n.sala_id,
      titulo: obraDe(n)?.titulo ?? null,
      proyectoFoto: fotoPor.get(obraDe(n)?.creador_id ?? "") ?? null,
    })),
    fotoPropia: foto ? urlFoto(foto.storage_path) : null,
  };
}

/** Las rutas de la web que en la app son otra cosa (o siguen en la web). */
function abrirDestino(destino: string) {
  if (destino === "/matches") return router.push("/convocatorias" as Href);
  if (destino === "/admin") return abrirWeb("/admin");
  router.push(destino as Href);
}

/** Notificaciones (`/notificaciones` de la web). */
export default function Notificaciones() {
  const t = useTranslations("chats.notificaciones");
  const tComun = useTranslations("comun");
  const tTitulos = useTranslations("titulos");
  const locale = useLocale();
  const color = useColores();
  const { sesion } = useSesion();
  const { recontar } = useNotificaciones();
  const userId = sesion?.user.id;
  const [datos, setDatos] = useState<{ lista: Notificacion[]; fotoPropia: string | null } | null>(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (userId) setDatos(await leer(userId));
  }, [userId]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const marcar = (ids: string[] | null, leida: string | null) =>
    setDatos((d) => d && { ...d, lista: d.lista.map((n) => (!ids || ids.includes(n.id) ? { ...n, leida_en: n.leida_en ?? leida } : n)) });

  // #347: se marca en la base y la campanita recuenta; si la base falla, vuelve a no leída.
  async function marcarLeida(n: Notificacion) {
    if (n.leida_en) return;
    const ahora = new Date().toISOString();
    marcar([n.id], ahora);
    const { error } = await supabase.from("notificaciones").update({ leida_en: ahora }).eq("id", n.id);
    if (error) setDatos((d) => d && { ...d, lista: d.lista.map((x) => (x.id === n.id ? { ...x, leida_en: null } : x)) });
    recontar();
  }

  async function marcarTodas() {
    if (!datos) return;
    const ahora = new Date().toISOString();
    const pendientes = datos.lista.filter((n) => !n.leida_en).map((n) => n.id);
    marcar(null, ahora);
    const { error } = await supabase.from("notificaciones").update({ leida_en: ahora }).is("leida_en", null);
    if (error) setDatos((d) => d && { ...d, lista: d.lista.map((x) => (pendientes.includes(x.id) ? { ...x, leida_en: null } : x)) });
    recontar();
  }

  async function abrir(n: Notificacion) {
    await marcarLeida(n);
    const destino = destinoNotificacion(n);
    if (destino) abrirDestino(destino);
  }

  const negrita = (txt: React.ReactNode) => <Texto style={{ fontFamily: fuente.semi, fontSize: 14 }}>{txt}</Texto>;
  const titulo = (n: Notificacion) => n.titulo ?? t("unaObra");
  const fecha = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-US" : "es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  function Cara({ url, encima }: { url: string | null; encima?: boolean }) {
    const estilo = {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: color.superficie,
      backgroundColor: color.ink100,
      marginLeft: encima ? -12 : 0,
    };
    return url ? <Image source={{ uri: url }} style={estilo} contentFit="cover" /> : <View style={estilo} />;
  }

  function Contenido({ n }: { n: Notificacion }) {
    const doble = (a: string, b: React.ReactNode) => (
      <>
        <Texto style={{ fontFamily: fuente.semi }}>{a}</Texto>
        <Texto variante="tenue" style={{ fontSize: 14 }}>
          {b}
        </Texto>
      </>
    );
    switch (n.tipo) {
      case "match":
        return doble(t("match.titulo"), t.rich("match.texto", { titulo: titulo(n), b: negrita }));
      case "convocado":
        return doble(t("convocado.titulo"), t.rich("convocado.texto", { titulo: titulo(n), b: negrita }));
      case "equipo_armado":
        return doble(t("equipo_armado.titulo"), t("equipo_armado.texto"));
      case "interes_recibido":
        return <Texto>{t("interes_recibido")}</Texto>;
      case "nuevo_match":
        return doble(t("nuevo_match.titulo"), t("nuevo_match.texto"));
      case "solicitud_acceso":
        return doble(t("solicitud_acceso.titulo"), t("solicitud_acceso.texto"));
      case "acceso_habilitado":
        return doble(t("acceso_habilitado.titulo"), t("acceso_habilitado.texto"));
      case "espera_vencida":
        return <Texto variante="tenue">{t.rich("espera_vencida", { titulo: titulo(n), b: negrita })}</Texto>;
      default:
        return <Texto>{t.rich("sala_creada", { titulo: titulo(n), b: negrita })}</Texto>;
    }
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tComun("volver")} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={color.textoTenue} />
        </Pressable>
        <Texto variante="titulo" accessibilityRole="header">
          {tTitulos("notificaciones")}
        </Texto>
      </View>
      {!datos ? (
        <ActivityIndicator color={color.texto} style={{ marginTop: 40 }} />
      ) : datos.lista.length === 0 ? (
        <View style={{ alignItems: "center", gap: 8, marginTop: 40, paddingHorizontal: 12 }}>
          <Ionicons name="notifications-outline" size={36} color={color.textoTenue} />
          <Texto variante="subtitulo" style={{ textAlign: "center" }}>
            {t("vacioTitulo")}
          </Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>
            {t("vacioDetalle")}
          </Texto>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {datos.lista.some((n) => !n.leida_en) && (
            <Texto variante="chico" onPress={marcarTodas} style={{ alignSelf: "flex-end", fontFamily: fuente.media }}>
              {t("marcarTodas")}
            </Texto>
          )}
          {datos.lista.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => abrir(n)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                borderWidth: 1,
                borderColor: color.borde,
                borderRadius: radio.campo,
                padding: 14,
                backgroundColor: n.leida_en ? color.superficie : color.fondoSutil,
              }}
            >
              {!n.leida_en && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#e62d03", marginTop: 8 }} />}
              {/* `match` es el valor del enum: la etiqueta visible es «hay equipo». */}
              {n.tipo === "match" && (
                <View style={{ flexDirection: "row" }}>
                  <Cara url={datos.fotoPropia} />
                  <Cara url={n.proyectoFoto} encima />
                </View>
              )}
              <View style={{ flex: 1, gap: 2, paddingLeft: n.leida_en && n.tipo !== "match" ? 16 : 0 }}>
                <Contenido n={n} />
                <Texto variante="chico" style={{ fontSize: 11 }}>
                  {fecha(n.creado_en)}
                </Texto>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Pantalla>
  );
}
