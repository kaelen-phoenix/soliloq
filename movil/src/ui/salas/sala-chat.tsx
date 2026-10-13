import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale, useTranslations } from "use-intl";
import { MAX_MENSAJE, primerNombre } from "@/lib/salas-reglas";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Denuncia } from "~/ui/denuncia";
import { useIa } from "~/ui/ia";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { useNoLeidos } from "./no-leidos";
import { suscribirConSesion } from "./realtime";

export interface Mensaje {
  id: string;
  autor_id: string;
  contenido: string;
  creado_en: string;
  noEnviado?: boolean;
}

export interface Integrante {
  perfil_id: string;
  nombre: string;
  foto_url: string | null;
  rol_en_obra: string;
  /** Tiene perfil de Talento: solo sus mensajes abren su perfil (#149). */
  esTalento: boolean;
}

/**
 * El chat de una sala, como `SalaChat` de la web: los mensajes en vivo (Realtime), mandar con
 * mensaje optimista y reintento, la lista de integrantes con la denuncia, y estar mirando la
 * sala = leerla (#216). El saludo con IA (#322) llega con la IA en #395.
 */
export function SalaChat({
  salaId,
  userId,
  mensajesIniciales,
  integrantes,
  esDueno = false,
}: {
  salaId: string;
  userId: string;
  mensajesIniciales: Mensaje[];
  integrantes: Integrante[];
  /** Es la sala de un Proyecto o Equipo propio: se ofrece el saludo con IA (#322). */
  esDueno?: boolean;
}) {
  const t = useTranslations("chats.sala");
  const locale = useLocale();
  const color = useColores();
  const abajo = useSafeAreaInsets().bottom;
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const ia = useIa();
  const [saludo, setSaludo] = useState<"listo" | "escribiendo" | string>("listo");
  const [mostrarIntegrantes, setMostrarIntegrantes] = useState(false);
  // #322: mientras quien armó el proyecto no escribió nada en su chat, se le ofrece un saludo.
  const ofrecerSaludo = esDueno && integrantes.length > 1 && !mensajes.some((m) => m.autor_id === userId) && !texto;

  async function escribirSaludo() {
    setSaludo("escribiendo");
    const r = await ia.saludo(salaId);
    if (!r.ok) return setSaludo(r.mensaje);
    // Si mientras tanto la persona empezó a escribir, no se le pisa lo suyo.
    setTexto((prev) => (prev.trim() ? prev : r.texto));
    setSaludo("listo");
  }
  const ultimoRef = useRef<string | null>(mensajesIniciales.at(-1)?.creado_en ?? null);

  // #216: estar mirando la sala = leerla. Al entrar, con cada mensaje que llega y al volver a
  // la app; no con la app en segundo plano: esos siguen contando como nuevos.
  const { marcarLeida } = useNoLeidos();
  useEffect(() => {
    if (AppState.currentState === "active") marcarLeida(salaId);
  }, [salaId, mensajes.length, marcarLeida]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (e) => {
      if (e === "active") marcarLeida(salaId);
    });
    return () => sub.remove();
  }, [salaId, marcarLeida]);

  // Respaldo del filtro real (RLS): un autor que no es integrante visible no se pinta.
  const visibles = useMemo(() => new Set(integrantes.map((i) => i.perfil_id)), [integrantes]);
  const visiblesRef = useRef(visibles);
  visiblesRef.current = visibles;

  useEffect(() => {
    async function recuperarPerdidos() {
      const query = supabase.from("mensajes").select("*").eq("sala_id", salaId).order("creado_en");
      const { data } = ultimoRef.current ? await query.gt("creado_en", ultimoRef.current) : await query;
      if (data && data.length > 0) {
        setMensajes((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...data.filter((m) => !ids.has(m.id))];
        });
        ultimoRef.current = data.at(-1)!.creado_en;
      }
    }
    const cerrar = suscribirConSesion(() =>
      supabase
        .channel(`sala-${salaId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "mensajes", filter: `sala_id=eq.${salaId}` },
          (payload) => {
            const nuevo = payload.new as Mensaje;
            if (!visiblesRef.current.has(nuevo.autor_id)) return;
            setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]));
            ultimoRef.current = nuevo.creado_en;
          },
        )
        .subscribe((estado) => {
          if (estado === "SUBSCRIBED") recuperarPerdidos();
        }),
    );
    // El canal no ve lo que llegó con la app en segundo plano.
    const sub = AppState.addEventListener("change", (e) => {
      if (e === "active") recuperarPerdidos();
    });
    return () => {
      cerrar();
      sub.remove();
    };
  }, [salaId]);

  async function mandar(contenido: string, idTemporal: string) {
    const { data, error } = await supabase
      .from("mensajes")
      .insert({ sala_id: salaId, autor_id: userId, contenido })
      .select()
      .single();
    if (error || !data) {
      setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? { ...m, noEnviado: true } : m)));
      return;
    }
    setMensajes((prev) => prev.map((m) => (m.id === idTemporal ? data : m)));
    ultimoRef.current = data.creado_en;
    // Push a los demás integrantes (por la web). No se espera: el mensaje ya salió bien.
    void llamarApi("mensaje-enviado", { mensajeId: data.id });
  }

  function enviar() {
    const contenido = texto.trim();
    if (!contenido || contenido.length > MAX_MENSAJE) return;
    const id = Crypto.randomUUID();
    setMensajes((prev) => [...prev, { id, autor_id: userId, contenido, creado_en: new Date().toISOString() }]);
    setTexto("");
    void mandar(contenido, id);
  }

  function reintentar(m: Mensaje) {
    const id = Crypto.randomUUID();
    setMensajes((prev) => [...prev.filter((x) => x.id !== m.id), { ...m, id, noEnviado: false }]);
    void mandar(m.contenido, id);
  }

  const integrantePor = (id: string) => integrantes.find((i) => i.perfil_id === id);
  const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "es-AR", { hour: "2-digit", minute: "2-digit" });
  // La lista va invertida: lo más nuevo abajo, pegado al cuadro de texto.
  const invertidos = useMemo(() => [...mensajes].reverse(), [mensajes]);

  function Avatar({ i }: { i: Integrante | undefined }) {
    return i?.foto_url ? (
      <Image source={{ uri: i.foto_url }} style={{ width: 28, height: 28, borderRadius: 14 }} contentFit="cover" />
    ) : (
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.ink100, alignItems: "center", justifyContent: "center" }}>
        <Texto variante="chico" style={{ fontFamily: fuente.semi }}>
          {(i?.nombre ?? "?")[0]}
        </Texto>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: mostrarIntegrantes }}
        onPress={() => setMostrarIntegrantes((v) => !v)}
        style={{ borderBottomWidth: 1, borderBottomColor: color.borde, paddingHorizontal: 16, paddingVertical: 8 }}
      >
        <Texto variante="chico" style={{ fontFamily: fuente.media, textTransform: "uppercase", letterSpacing: 0.6, fontSize: 11 }}>
          {t("integrantes", { n: integrantes.length })}
        </Texto>
      </Pressable>

      {mostrarIntegrantes && (
        <View style={{ gap: 10, borderBottomWidth: 1, borderBottomColor: color.borde, padding: 16 }}>
          {integrantes.map((i) => (
            <View key={i.perfil_id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar i={i} />
              <View>
                <Texto style={{ fontFamily: fuente.media, fontSize: 14 }}>{i.nombre}</Texto>
                <Texto variante="chico">{i.rol_en_obra}</Texto>
              </View>
            </View>
          ))}
          {/* La denuncia vive acá, en la lista de integrantes: es donde se mira para reportar. */}
          <Denuncia salaId={salaId} queSeDenuncia={t("queSeDenuncia")} />
        </View>
      )}

      <FlatList
        data={invertidos}
        inverted
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1 }}
        ListEmptyComponent={
          // Con la lista invertida el vacío queda dado vuelta: se lo endereza.
          <View style={{ flex: 1, justifyContent: "center", transform: [{ scaleY: -1 }] }}>
            <Texto variante="tenue" style={{ textAlign: "center", maxWidth: 260, alignSelf: "center" }}>
              {t("vacio")}
            </Texto>
          </View>
        }
        renderItem={({ item: m }) => {
          const autor = integrantePor(m.autor_id);
          const propio = m.autor_id === userId;
          // #149: la foto y el nombre de un Talento abren su perfil.
          const puedeVerPerfil = !propio && !!autor?.esTalento;
          const verPerfil = () => router.push(`/talentos/${m.autor_id}` as Href);
          return (
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, justifyContent: propio ? "flex-end" : "flex-start" }}>
              {!propio &&
                (puedeVerPerfil ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("verPerfilDe", { nombre: autor?.nombre ?? t("integranteGenerico") })}
                    onPress={verPerfil}
                  >
                    <Avatar i={autor} />
                  </Pressable>
                ) : (
                  <View style={{ width: 28 }} />
                ))}
              <View
                style={{
                  maxWidth: "78%",
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: propio ? color.accion : color.ink100,
                }}
              >
                {!propio && (
                  <Texto
                    onPress={puedeVerPerfil ? verPerfil : undefined}
                    style={{ fontFamily: fuente.media, fontSize: 11, opacity: 0.6 }}
                  >
                    {primerNombre(autor?.nombre ?? t("integrante"))}
                  </Texto>
                )}
                <Texto style={{ color: propio ? color.accionTexto : color.texto }}>{m.contenido}</Texto>
                <Texto style={{ fontSize: 10, opacity: 0.5, color: propio ? color.accionTexto : color.texto }}>
                  {hora(m.creado_en)}
                </Texto>
                {m.noEnviado && (
                  <Texto
                    onPress={() => reintentar(m)}
                    style={{ fontSize: 11, textDecorationLine: "underline", color: propio ? color.accionTexto : color.texto }}
                  >
                    {t("noEnviado")}
                  </Texto>
                )}
              </View>
            </View>
          );
        }}
      />

      {(ofrecerSaludo || (saludo !== "listo" && saludo !== "escribiendo")) && (
        <View style={{ paddingHorizontal: 10, paddingTop: 8, gap: 4 }}>
          <Texto
            accessibilityRole="button"
            onPress={saludo === "escribiendo" ? undefined : escribirSaludo}
            style={{ fontFamily: fuente.media, fontSize: 14, color: color.acento }}
          >
            {saludo === "escribiendo" ? t("escribiendo") : t("escribirSaludo")}
          </Texto>
          {saludo !== "listo" && saludo !== "escribiendo" && <Texto variante="error">{saludo}</Texto>}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: color.borde,
          backgroundColor: color.superficie,
          padding: 10,
          paddingBottom: 10 + abajo,
        }}
      >
        <TextInput
          accessibilityLabel={t("placeholder")}
          value={texto}
          onChangeText={setTexto}
          maxLength={MAX_MENSAJE}
          placeholder={t("placeholder")}
          placeholderTextColor={color.textoTenue}
          multiline
          style={{
            flex: 1,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: color.borde,
            borderRadius: radio.pildora,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontFamily: fuente.normal,
            fontSize: 16,
            color: color.texto,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !texto.trim() }}
          disabled={!texto.trim()}
          onPress={enviar}
          style={{
            alignSelf: "flex-end",
            borderRadius: radio.pildora,
            backgroundColor: color.accion,
            paddingHorizontal: 16,
            paddingVertical: 11,
            opacity: texto.trim() ? 1 : 0.4,
          }}
        >
          <Texto style={{ fontFamily: fuente.media, fontSize: 14, color: color.accionTexto }}>{t("enviar")}</Texto>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
