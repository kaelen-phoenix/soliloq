import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { vencimiento, type EstadoConvocado, type FilaConvocado, type RolDisponible } from "@/lib/matches";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { Avatar, BotonChico, Chip, Ventana, type TonoChip } from "./comunes";
import { convocarMatch, darDeBajaConvocado, descartarConvocado } from "./datos";

const TONO: Record<EstadoConvocado, TonoChip> = {
  en_convocados: "neutro",
  esperando_confirmacion: "alerta",
  en_sala: "accion",
};

/**
 * «Mis convocados» (#143, #287), como `ConvocadosLista` de la web: los matches de los Proyectos
 * y Equipos propios, para convocar (eligiendo rol si el Proyecto tiene varios, #152),
 * descartar, o dar de baja a quien ya está en la sala. Tocar a alguien abre su perfil.
 */
export function ConvocadosLista({
  filas: iniciales,
  rolesPorObra,
  alCambiar,
}: {
  filas: FilaConvocado[];
  rolesPorObra: Record<string, RolDisponible[]>;
  /** Para releer la pantalla después de una acción. */
  alCambiar: () => void;
}) {
  const t = useTranslations("proyectos.convocados");
  const tc = useTranslations("comun");
  const tErr = useTranslations("proyectos.matches.errores");
  const color = useColores();
  const [filas, setFilas] = useState(iniciales);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [eligiendoRol, setEligiendoRol] = useState<FilaConvocado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rolesDe = (f: FilaConvocado | null) => (f?.obraId ? rolesPorObra[f.obraId] ?? null : null);

  useEffect(() => setFilas(iniciales), [iniciales]);

  async function convocar(f: FilaConvocado, rolId?: string) {
    setOcupadoId(f.matchId);
    const res = await convocarMatch(f.matchId, rolId);
    setOcupadoId(null);
    if (!res.ok) return setError(tErr(res.error));
    setError(null);
    setEligiendoRol(null);
    setFilas((prev) => prev.map((x) => (x.matchId === f.matchId ? { ...x, estado: "esperando_confirmacion" } : x)));
    alCambiar();
  }

  function alConvocar(f: FilaConvocado) {
    setError(null);
    // Con más de un rol hay que elegir; con uno solo (o un Equipo) se convoca directo (#152).
    const roles = rolesDe(f);
    if (roles && roles.length > 1) setEligiendoRol(f);
    else convocar(f, roles?.[0]?.id);
  }

  async function confirmar(f: FilaConvocado) {
    setOcupadoId(f.matchId);
    const res =
      f.estado === "en_sala" && f.convocatoriaId
        ? await darDeBajaConvocado(f.convocatoriaId)
        : await descartarConvocado(f.matchId);
    setOcupadoId(null);
    setConfirmando(null);
    if (!res.ok) return setError(tErr(res.error));
    setError(null);
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    alCambiar();
  }

  if (filas.length === 0) return null;
  const roles = rolesDe(eligiendoRol);

  return (
    <View style={{ gap: 8 }}>
      {error && !eligiendoRol && <Texto variante="error">{error}</Texto>}
      {filas.map((f) => {
        const venc = f.estado === "en_convocados" && f.expiraEn ? vencimiento(f.expiraEn) : null;
        return (
          <View key={f.matchId} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, backgroundColor: color.superficie }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
              <Pressable accessibilityRole="link" onPress={() => router.push(`/talentos/${f.talentoId}` as Href)}>
                <Avatar url={f.fotoUrl} nombre={f.nombre} />
              </Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <Texto numberOfLines={1} style={{ fontFamily: fuente.media, fontSize: 15 }} onPress={() => router.push(`/talentos/${f.talentoId}` as Href)}>
                  {f.nombre}
                </Texto>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Chip texto={t(`estado.${f.estado}`)} tono={TONO[f.estado]} />
                  {venc && <Texto variante="chico">{t(venc.clave, { dias: venc.dias })}</Texto>}
                </View>
              </View>
            </View>

            {confirmando === f.matchId ? (
              <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: color.borde, padding: 14 }}>
                <Texto>{f.estado === "en_sala" ? t("confirmarBaja", { nombre: f.nombre }) : t("confirmarDescarte", { nombre: f.nombre })}</Texto>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Boton variante="peligro" cargando={ocupadoId === f.matchId} onPress={() => confirmar(f)}>
                      {f.estado === "en_sala" ? t("darDeBaja") : t("descartar")}
                    </Boton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton variante="secundario" disabled={ocupadoId === f.matchId} onPress={() => setConfirmando(null)}>
                      {tc("cancelar")}
                    </Boton>
                  </View>
                </View>
              </View>
            ) : (
              (f.estado === "en_convocados" || f.estado === "en_sala") && (
                <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
                  {f.estado === "en_convocados" && (
                    <BotonChico
                      texto={ocupadoId === f.matchId ? "…" : f.cupoLleno ? t("cupoLleno") : t("convocar")}
                      deshabilitado={f.cupoLleno || ocupadoId === f.matchId}
                      onPress={() => alConvocar(f)}
                    />
                  )}
                  <BotonChico
                    peligro
                    texto={f.estado === "en_sala" ? t("darDeBaja") : t("descartar")}
                    onPress={() => setConfirmando(f.matchId)}
                  />
                </View>
              )
            )}
          </View>
        );
      })}

      <Ventana visible={!!eligiendoRol} onCerrar={() => setEligiendoRol(null)} etiqueta={t("elegirRol")}>
        {eligiendoRol && (
          <>
            <Texto style={{ fontFamily: fuente.media }}>{t("paraQueRol", { nombre: eligiendoRol.nombre })}</Texto>
            {error && <Texto variante="error">{error}</Texto>}
            <View style={{ gap: 6 }}>
              {roles?.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !r.disponible }}
                  disabled={!r.disponible || ocupadoId === eligiendoRol.matchId}
                  onPress={() => convocar(eligiendoRol, r.id)}
                  style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, padding: 12, opacity: r.disponible ? 1 : 0.4 }}
                >
                  <Texto style={{ fontFamily: fuente.media }}>
                    {r.nombre}
                    {!r.disponible && <Texto variante="chico"> {t("cubierto")}</Texto>}
                  </Texto>
                </Pressable>
              ))}
            </View>
            <Boton variante="fantasma" disabled={ocupadoId === eligiendoRol.matchId} onPress={() => setEligiendoRol(null)}>
              {tc("cancelar")}
            </Boton>
          </>
        )}
      </Ventana>
    </View>
  );
}
