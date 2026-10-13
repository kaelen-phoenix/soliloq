import { useState } from "react";
import { useTranslations } from "use-intl";
import { llamarApi } from "~/lib/api";
import { useSesion } from "~/lib/sesion";
import { abrirWeb } from "~/lib/web";
import { Casilla } from "~/ui/basicos";
import { AltaPerfil } from "~/ui/perfil/alta-perfil";
import { Boton } from "~/ui/boton";
import { Marca } from "~/ui/marca";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";
import { useColores } from "~/ui/tema";

/** Aceptar las Normas de la Comunidad (#180), como `/aceptar-normas` de la web. */
function AceptarNormas() {
  const t = useTranslations("aceptarNormas");
  const tError = useTranslations("cuenta.errores");
  const color = useColores();
  const { recargar } = useSesion();
  const [marcado, setMarcado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aceptar() {
    if (!marcado) return setError(t("error"));
    setError(null);
    setEnviando(true);
    // Por la web: además de guardarlo, manda el mail de bienvenida (#272).
    const r = await llamarApi("normas");
    if (!r.ok) {
      setEnviando(false);
      return setError(tError("generico"));
    }
    // Con las normas aceptadas, la navegación pasa sola al paso siguiente.
    await recargar();
  }

  return (
    <>
      <Texto variante="titulo" accessibilityRole="header">
        {t("titulo")}
      </Texto>
      <Texto variante="tenue">{t("texto")}</Texto>
      <Casilla
        marcada={marcado}
        onCambio={(v) => {
          setMarcado(v);
          setError(null);
        }}
      >
        <Texto>
          {t("checkbox")}{" "}
          <Texto style={{ color: color.acento }} onPress={() => abrirWeb("/normas")}>
            {t("enlace")}
          </Texto>
        </Texto>
      </Casilla>
      {error && <Texto variante="error">{error}</Texto>}
      <Boton onPress={aceptar} cargando={enviando}>
        {enviando ? t("enviando") : t("boton")}
      </Boton>
    </>
  );
}

/**
 * La cuenta todavía no puede entrar a la app: solicitud pendiente, falta aceptar las Normas o
 * completar el perfil, o está suspendida (las mismas guardas que la web).
 *
 * El alta del perfil va en `AltaPerfil`.
 */
export default function Estado() {
  const { destino, recargar, cerrarSesion } = useSesion();
  const t = useTranslations();
  const [releyendo, setReleyendo] = useState(false);

  async function releer() {
    setReleyendo(true);
    await recargar();
    setReleyendo(false);
  }

  // El alta del perfil tiene su propia pantalla, con el asistente por pasos.
  if (destino === "completar-perfil") return <AltaPerfil />;

  const contenido =
    destino === "aceptar-normas" ? (
      <AceptarNormas />
    ) : destino === "solicitud-pendiente" ? (
      <>
        <Texto variante="titulo">{t("solicitudPendiente.titulo")}</Texto>
        <Texto variante="tenue">{t("solicitudPendiente.texto")}</Texto>
        <Boton variante="secundario" onPress={releer} cargando={releyendo}>
          {t("comun.reintentar")}
        </Boton>
      </>
    ) : (
      <>
        <Texto variante="titulo">{t("suspendido.titulo")}</Texto>
        <Texto variante="tenue">{t("suspendido.texto")}</Texto>
      </>
    );

  return (
    <Pantalla contentContainerStyle={{ justifyContent: "center", gap: 20 }}>
      <Marca />
      {contenido}
      <Boton variante="fantasma" onPress={cerrarSesion}>
        {t("cuenta.cerrarSesion")}
      </Boton>
    </Pantalla>
  );
}
