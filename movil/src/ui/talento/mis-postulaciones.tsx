import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import type { FilaMatchTalento } from "@/lib/matches";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { Avatar, BotonChico, Chip, type TonoChip } from "./comunes";
import { desvincularmeDeSala, retirarmeDeMatch } from "./datos";

const TONO: Record<FilaMatchTalento["estado"], TonoChip> = { match: "neutro", convocado: "alerta", en_sala: "accion" };

/**
 * «Mis postulaciones» (#298), como `MisMatchesTalento` de la web: con qué Proyectos y Equipos
 * hizo match quien mira, en qué está cada uno, y la salida —retirarse antes de entrar, o salir
 * del chat.
 */
export function MisPostulaciones({ filas: iniciales, alCambiar }: { filas: FilaMatchTalento[]; alCambiar: () => void }) {
  const t = useTranslations("proyectos.misMatches");
  const tErr = useTranslations("proyectos.matches.errores");
  const tChat = useTranslations("chats.acciones");
  const color = useColores();
  const [filas, setFilas] = useState(iniciales);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setFilas(iniciales), [iniciales]);

  async function salir(f: FilaMatchTalento) {
    setOcupado(f.matchId);
    setError(null);
    const enSala = f.estado === "en_sala" && !!f.salaId;
    const res = enSala ? await desvincularmeDeSala(f.salaId!) : await retirarmeDeMatch(f.matchId);
    setOcupado(null);
    setConfirmando(null);
    if (!res.ok) return setError(enSala ? tChat(res.error) : tErr(res.error));
    setFilas((prev) => prev.filter((x) => x.matchId !== f.matchId));
    alCambiar();
  }

  return (
    <View style={{ gap: 8 }}>
      {error && <Texto variante="error">{error}</Texto>}
      {filas.map((f) => (
        <View key={f.matchId} style={{ borderWidth: 1, borderColor: color.borde, borderRadius: radio.campo, backgroundColor: color.superficie, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar url={f.fotoUrl} nombre={f.titulo} />
            <View style={{ flex: 1, gap: 2 }}>
              <Pressable
                disabled={!f.obraId}
                accessibilityRole={f.obraId ? "link" : undefined}
                onPress={() => f.obraId && router.push(`/obras/${f.obraId}` as Href)}
              >
                <Texto numberOfLines={1} style={{ fontFamily: fuente.media, fontSize: 15 }}>
                  {f.titulo}
                </Texto>
              </Pressable>
              <Texto variante="chico" numberOfLines={1}>
                {f.creadorNombre
                  ? t(f.esEquipo ? "equipoDe" : "proyectoDe", { nombre: f.creadorNombre })
                  : t(f.esEquipo ? "equipo" : "proyecto")}
              </Texto>
              <Chip texto={t(`estado.${f.estado}`)} tono={TONO[f.estado]} />
            </View>
          </View>

          {confirmando === f.matchId ? (
            <View style={{ gap: 8 }}>
              <Texto variante="chico">{f.estado === "en_sala" ? t("confirmarSalir") : t("confirmarRetirarte")}</Texto>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <BotonChico
                  peligro
                  deshabilitado={ocupado === f.matchId}
                  texto={ocupado === f.matchId ? "…" : f.estado === "en_sala" ? t("siSalir") : t("siRetirarme")}
                  onPress={() => salir(f)}
                />
                <BotonChico texto={t("no")} onPress={() => setConfirmando(null)} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {f.estado === "convocado" && <BotonChico texto={t("responder")} onPress={() => router.push("/convocatoria" as Href)} />}
              {f.estado === "en_sala" && f.salaId && (
                // El chat llega a la app en la etapa 3 (#394): mientras, en la web.
                <BotonChico texto={t("irAlChat")} onPress={() => router.push(`/salas/${f.salaId}`)} />
              )}
              <BotonChico peligro texto={f.estado === "en_sala" ? t("salirDelChat") : t("retirarme")} onPress={() => setConfirmando(f.matchId)} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
